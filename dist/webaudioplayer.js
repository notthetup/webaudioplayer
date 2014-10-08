/*! webaudioplayer - v0.0.0 - Wed Oct 08 2014 11:03:26 GMT+0800 (SGT) */ 
function WebAudioPlayer() {
    "use strict";

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new window.AudioContext();

    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;

    this.onLoadComplete = null;

    var nodeCount = 0;
    var sourceNodes = [];
    var releaseGainNode = this.audioContext.createGain();
    releaseGainNode.connect( this.audioContext.destination );

    var sourceBuffer = null;
    Object.defineProperty( this, 'source', {
        enumerable: true,
        configurable: false,
        set: function ( newSource ) {
            getAudio( newSource, function ( err, buffer ) {
                sourceBuffer = buffer;
                if ( typeof this.onLoadComplete === 'function' ) {
                    this.onLoadComplete( err );
                }
            }, null, this.audioContext );
        },
        get: function () {
            return sourceBuffer;
        }
    } );

    var playbackRateValue = 1;
    Object.defineProperty( this, 'speed', {
        enumerable: true,
        configurable: false,
        set: function ( newSpeed ) {
            sourceNodes.forEach( function ( sourceObj ) {
                sourceObj.source.playbackRate.value = newSpeed;
                newSpeed = sourceObj.source.playbackRate.value;
            } );
            playbackRateValue = newSpeed;
        },
        get: function () {
            return playbackRateValue;
        }
    } );

}

WebAudioPlayer.prototype.start = function ( when, offset, duration ) {
    "use strict";
    if ( !sourceBuffer ) {
        console.warn( "The sound hasn't loaded yet" );
    }

    newSourceNode = this.audioContext.createBufferSource();
    newSourceNode.source = sourceBuffer;
    newSourceNode.loop = this.loop;
    newSourceNode.loopStart = this.loopStart;
    newSourceNode.loopEnd = this.loopEnd;
    newSourceNode.playbackRate = playbackRateValue;
    newSourceNode.onend = wrapAroundOnEndCallback( ++nodeCount );

    sourceNodes.push( {
        'source': newSourceNode,
        'index': nodeCount
    } );

    function wrapAroundOnEndCallback( index ) {
        return function () {
            sourceNodes.forEach( function ( sourceObj, elIndex ) {
                if ( sourceObj.index === index ) {
                    sourceNodes.splice( 1, elIndex );
                }
            } );
        };
    }

    newSourceNode.connect( releaseGainNode );
    newSourceNode.start( when, offset, duration );
};

// WebAudioPlayer.prototype.pause = function(when ) {
// 	// body...
// };

WebAudioPlayer.prototype.stop = function ( when ) {
    "use strict";
    sourceNodes.forEach( function ( sourceObj ) {
        sourceObj.source.stop( when );
    } );
};

WebAudioPlayer.prototype.release = function ( when ) {
    "use strict";

    var RELEASE_TIME = 0.5;
    var RELEASE_PAD = 1 / this.audioContext.sampleRate;

    this.releaseGainNode.gain.cancelScheduledValues( when );
    this.releaseGainNode.gain.setValueAtTime( this.volume, when );
    this.releaseGainNode.gain.linearRampToValueAtTime( 0, when + RELEASE_TIME );
    this.stop( when + RELEASE_TIME + RELEASE_PAD );
};

function getAudio( URL, onLoadCallback, onProgressCallback, audioContext ) {
    "use strict";
    if ( !audioContext ) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
    }

    var parameterType = Object.prototype.toString.call( URL );
    if ( parameterType === "[object String]" ) {
        var request = new XMLHttpRequest();
        request.open( 'GET', URL, true );
        request.responseType = 'arraybuffer';
        request.onload = function () {
            decodeAudio( audioContext, request.response, onLoadCallback );
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
    } else if ( parameterType === "[object File]" ) {
        var reader = new FileReader();
        reader.onload = function () {
            decodeAudio( audioContext, reader.result, onLoadCallback );
        };
        reader.addEventListener( "progress", onProgressCallback, false );
        reader.readAsArrayBuffer( URL );
    } else if ( parameterType === "[object AudioBuffer]" ) {
        if ( typeof onLoadCallback === 'function' ) {
            onLoadCallback( null, URL );
        }
    }

    function decodeAudio( audioContext, audiobuffer, onLoadCallback ) {
        audioContext.decodeAudioData( request.response, function ( buffer ) {
            if ( typeof onLoadCallback === 'function' ) {
                onLoadCallback( null, buffer );
            }
        }, function () {
            if ( typeof onLoadCallback === 'function' ) {
                onLoadCallback( new Error( "Decoding Error" ), null );
            }
        } );
    }
}
