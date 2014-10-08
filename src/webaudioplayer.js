( function ( window ) {
	"use strict";

	// Create Audio Context
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	window.audioContext = window.audioContext || new window.AudioContext();

	function WebAudioPlayer( URL ) {

		this.audioContext = window.audioContext || new window.AudioContext();

		this._nodeCount = 0;
		this._sourceNodes = [];
		this._sourceBuffer = null;
		this._playbackRate = 1;
		this._volume = 1;

		this._releaseGainNode = this.audioContext.createGain();
		this._releaseGainNode.connect( this.audioContext.destination );

		// Public Properties

		this.loop = false;
		this.loopStart = 0;
		this.loopEnd = null;
		this.onLoadComplete = null;

		var self = this;

		Object.defineProperty( this, 'source', {
			enumerable: true,
			configurable: false,
			set: function ( newSource ) {
				self._getAudio( newSource, function ( err, buffer ) {
					//console.log( "Decoding complete", newSource );
					self._sourceBuffer = buffer;
					if ( typeof self.onLoadComplete === 'function' ) {
						self.onLoadComplete( err );
					}
				}, null, self.audioContext );
			},
			get: function () {
				return self._sourceBuffer;
			}
		} );

		Object.defineProperty( this, 'speed', {
			enumerable: true,
			configurable: false,
			set: function ( newSpeed ) {
				self._sourceNodes.forEach( function ( sourceObj ) {
					sourceObj.source.playbackRate.value = newSpeed;
					newSpeed = sourceObj.source.playbackRate.value;
				} );
				self._playbackRate = newSpeed;
			},
			get: function () {
				return self._playbackRate;
			}
		} );

		Object.defineProperty( this, 'volume', {
			enumerable: true,
			configurable: false,
			set: function ( newSpeed ) {
				this._volume = newSpeed;
				this._releaseGainNode.gain.value = this._volume;
			},
			get: function () {
				return this._releaseGainNode.gain.value;
			}
		} );

		if ( URL ) {
			this.source = URL;
		}
	}

	// Public Methods
	WebAudioPlayer.prototype.start = function ( when, offset, duration ) {

		if ( !this._sourceBuffer ) {
			console.warn( "The sound hasn't loaded yet" );
			return;
		}

		if ( !when || when < this.audioContext.currentTime ) {
			when = this.audioContext.currentTime;
		}

		var newSourceNode = this.audioContext.createBufferSource();
		newSourceNode.buffer = this._sourceBuffer;
		newSourceNode.loop = this.loop;
		newSourceNode.loopStart = this.loopStart;
		newSourceNode.loopEnd = this.loopEnd;
		newSourceNode.playbackRate.value = this._playbackRate;
		newSourceNode.onended = wrapAroundOnEndCallback( ++this._nodeCount );

		this._sourceNodes.push( {
			'source': newSourceNode,
			'index': this._nodeCount
		} );

		var self = this;

		function wrapAroundOnEndCallback( index ) {
			return function () {
				console.log( "Ended: ", index );
				self._sourceNodes.forEach( function ( sourceObj, elIndex ) {
					if ( sourceObj.index === index ) {
						self._sourceNodes.splice( elIndex, 1 );
					}
				} );
			};
		}

		this._releaseGainNode.gain.cancelScheduledValues( when );
		this._releaseGainNode.gain.setValueAtTime( this.volume, when );

		newSourceNode.connect( this._releaseGainNode );
		if ( duration === undefined ) {
			newSourceNode.start( when, offset );
		} else {
			newSourceNode.start( when, offset, duration );
		}

	};

	// WebAudioPlayer.prototype.pause = function(when ) {
	// 	// body...
	// };

	WebAudioPlayer.prototype.stop = function ( when ) {
		this._sourceNodes.forEach( function ( sourceObj ) {
			sourceObj.source.stop( when );
		} );
	};

	WebAudioPlayer.prototype.release = function ( when ) {
		if ( !when || when < this.audioContext.currentTime ) {
			when = this.audioContext.currentTime;
		}

		var RELEASE_TIME = 0.5;
		var RELEASE_PAD = 1 / this.audioContext.sampleRate;

		this._releaseGainNode.gain.cancelScheduledValues( when );
		this._releaseGainNode.gain.setValueAtTime( this.volume, when );
		this._releaseGainNode.gain.linearRampToValueAtTime( 0, when + RELEASE_TIME );
		this.stop( when + RELEASE_TIME + RELEASE_PAD );
	};

	// Helper methods
	WebAudioPlayer.prototype._getAudio = function ( URL, onLoadCallback, onProgressCallback, audioContext ) {
		if ( !audioContext ) {
			window.AudioContext = window.AudioContext || window.webkitAudioContext;
			audioContext = new AudioContext();
		}

		//console.log( "Loading", URL );

		var self = this;

		var parameterType = Object.prototype.toString.call( URL );
		if ( parameterType === "[object String]" ) {
			var request = new XMLHttpRequest();
			request.open( 'GET', URL, true );
			request.responseType = 'arraybuffer';
			request.onload = function () {
				self._decodeAudio( audioContext, request.response, onLoadCallback );
			};
			request.onerror = function () {
				if ( typeof onLoadCallback === 'function' ) {
					onLoadCallback( new Error( "Loading Error" ), null );
				}
			};
			request.onprogress = function ( event ) {
				if ( typeof onProgressCallback === 'function' ) {
					onProgressCallback( event );
				}
			};
			request.send();
		} else if ( parameterType === " [object File]" ) {
			var reader = new FileReader();
			reader.onload = function () {
				this._decodeAudio( audioContext, reader.result, onLoadCallback );
			};
			reader.addEventListener( "progress ", onProgressCallback, false );
			reader.readAsArrayBuffer( URL );
		} else if ( parameterType === " [object AudioBuffer]" ) {
			if ( typeof onLoadCallback === 'function' ) {
				onLoadCallback( null, URL );
			}
		}
	};

	WebAudioPlayer.prototype._decodeAudio = function ( audioContext, audiobuffer, onLoadCallback ) {
		//console.log( "Decoding", audiobuffer );
		audioContext.decodeAudioData( audiobuffer, function ( buffer ) {
			if ( typeof onLoadCallback === 'function' ) {
				onLoadCallback( null, buffer );
			}
		}, function () {
			if ( typeof onLoadCallback === 'function' ) {
				onLoadCallback( new Error( "Decoding Error " ), null );
			}
		} );
	};

	window.WebAudioPlayer = WebAudioPlayer;
} )( window );
