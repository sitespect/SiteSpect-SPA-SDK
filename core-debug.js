/* Copyright 2017, SiteSpect, Inc. All Rights Reserved. */
/* This file should be minified using Google's Closure Compiler to produce Engine/js/core. */
/**
 * @param {Window} window global object.
 * @param {?undefined=} undefined parameter never passed to ensure we always
 *                      have undefined.
 */
(function( window, undefined ) {

	/**
	 * window.document
	 * @type {Document}
	 */
	var document = window.document;

	/**
	 * window.location
	 * document.domain & window.location don't play well together
	 * http://bugs.jquery.com/ticket/8138
	 * My research shows that the issue is caused by having a reference to the old
	 * window.location object from before the document.domain was set. The safest &
	 * shortest alternative is to just refer to window.locaton directly, even if the
	 * window is a local reference to the global this/window.
	 * @type {Location}
	 */
	//var location = window.location,

	/**
	 * @namespace SiteSpect Core JavaScript Utilities
	 * @type {Object}
	 */
	var SS = window.SS || {};
	window.SS = SS;

	/**
	 * Alias for encodeURIComponent
	 * @type {Function}
	 */
	var encodeURIComponent = window.encodeURIComponent;

	/**
	 * Basic HTTP Cookie handling.
	 * @author J Rob Gant <rgant@sitespect.com>
	 * @type {Function}
	 * $Id: ss-cookie.js 15253 2011-09-30 17:14:48Z rgant $
	 */
	SS.Cookie = (function () {
		/**
		 * Delimiter for array to string conversions. Use a control character to
		 * avoid having to handle it appearing in the array values.
		 * @const
		 * @private
		 * @type {string}
		 */
		var _delim = '\v';

		/**
		 * Encode the cookie name, value &amp; options as a string
		 * @private
		 * @param {string} name Cookie name.
		 * @param {string} value Cookie value.
		 * @param {number=} maxage Time in miliseconds for cookie to persist, default to
		 *					session*
		 * @param {boolean=} secure HTTPS only cookie, default false
		 * @param {string=} domain Defaults to parent domain of site (.example.com)
		 * @param {string=} path Defaults to /
		 * @return {string} the encoded string for setting a cookie in document.cookies.
		 * *For backwards compatibility the third parameter can be a string that
		 * begins with a semicolon and contains all of the options for the cookie
		 */
		function _createCookieStr(name, value, maxage, secure, domain, path) {
			var opts;
			// Check for depreciated useage of the 3rd parameter
			if (!maxage || maxage.toString().substr(0, 1) !== ';') {
				if (!path) {
					path =  '/';
				}

				if (!domain) {
					// Domain is either the entire IP address
					// or the parent level domain of the hostname
					domain = window.location.hostname.match(/^[\d.]+|(?:\.[\da-z\-]+)*[\da-z\-]+\.[\da-z\-]+$/i)[0];
				}

				// All cookie domains should start with a dot
				// http://www.ietf.org/rfc/rfc2109.txt
				if (domain.substr(0, 1) !== '.') {
					domain = '.' + domain;
				}

				secure = (!secure) ? '' : ';secure';

				// jslint ignore, null == undefined != (0 || "")
				if (maxage != null) {
					maxage = parseInt(maxage, 10);
					if (isNaN(maxage)) { maxage = 0; }
					// IE didn't originally support max-age, but all browsers support expires
					maxage = ';expires=' + new Date(+new Date() + maxage).toUTCString();
				}

				opts = ';path=' + path + ';domain=' + domain + maxage + secure;
			} else {
				// This code path is depreciated
				opts = maxage;
			}
			return encodeURIComponent(name) + '=' + encodeURIComponent(value) + opts;
		}
		/**
		 * Decodes cookie value from string of cookies. Returns an empty string if
		 * the specified cookie name isn't found.
		 * @private
		 * @param {string} name Cookie name.
		 * @param {string} cookies (typically document.cookies).
		 * @return {string} value of the cookie specified.
		 */
		function _retrieveCookieVal(name, cookies) {
			name = ' ' + name + '=';
			cookies = ' ' + cookies + ';';

			var indx = cookies.indexOf(name);

			if (indx >= 0) {
				indx += name.length;
				return decodeURIComponent(cookies.substring(indx, cookies.indexOf(';', indx)));
			}

			return '';
		}
		/**
		 * Converts a string to an array. Uses _delim for split.
		 * @private
		 * @param {string} value List of values delimited by _delim.
		 * @return {Array.<string>} Array of values.
		 */
		function _parseStrToArr(value) { return value.split(_delim); }
		/**
		 * Converts an array to a string. Uses _delim for join.
		 * @private
		 * @param {Array.<string>} value Array of values.
		 * @return {string} List of values delimited by _delim.
		 */
		function _parseArrToStr(value) { return value.join(_delim); }

		/**
		 * Obtains the value of the specified cookie, and handles parsing the string
		 * value to an array if appropriate.
		 * @param {string} name Cookie name.
		 * @param {string=} return_type a = always return an array,
		 *                              s = always return a string,
		 *                              any other value to do what is appropriate
		 *                              based upon the presense of the delimiter
		 *                              character in the value (optional).
		 * @return {(string|Array)} The expanded cookie value.
		 */
		function getCookieValue(name, return_type) {
			if (!name) { return; }

			var value = _retrieveCookieVal(name, document.cookie);

			if (!value) { return ''; }

			if (return_type) {
				return_type = return_type.substr(0, 1).toLowerCase();
			}

			switch (return_type) {
				case 's': return value;
				case 'a': return _parseStrToArr(value);
				default: return (value.match(_delim)) ? _parseStrToArr(value) : value;
			}
		}
		/**
		 * Add/Replace an HTML cookie
		 * @param {string} name Cookie name.
		 * @param {(string|Array.<string>)} value Arrays are passed to _parseArrToStr.
		 * @param {number=} maxage Time in miliseconds for cookie to persist, default to
		 *					session*
		 * @param {boolean=} secure HTTPS only cookie, default false
		 * @param {string=} domain Defaults to parent domain of site (.example.com)
		 * @param {string=} path Defaults to /
		 * @return {string} the encoded string for setting a cookie in document.cookies.
		 * *For backwards compatibility the third parameter can be a string that
		 * begins with a semicolon and contains all of the options for the cookie
		 */
		function setCookie(name, value, maxage, secure, domain, path) {
			// Cookie name is required & cannot match one of the cookie options
			if (!name || /^(?:expires|max-age|path|domain|secure|HttpOnly)$/i.test(name)) {
				return;
			}

			if (typeof value === 'object') {
				value = _parseArrToStr(value);
			}

			document.cookie = _createCookieStr(name, value, maxage, secure, domain, path);
		}

		return {
			get: getCookieValue,
			set: setCookie
		};
	}());

	/**
	 * Basic W3 DOM Event handling.
	 * @author J Rob Gant <rgant@sitespect.com>
	 * @type {Function}
	 * $Id: ss-js-events.js 13405 2011-04-25 14:30:36Z rgant $
	 */
	SS.JSEvents = (function() {
		/**
		 * Sets a new event to trigger on the object and call the function specified.
		 * @author Peter-Paul Koch <http://quirksmode.org/>
		 * @see http://www.quirksmode.org/js/eventSimple.html
		 * @param {Node} obj element to attach event.
		 * @param {string} evt JS event name, not prefixed by 'on'.
		 * @param {function(Event)} fn function to call when event triggers.
		 */
		function addEventSimple(obj, evt, fn) {
			if (obj.addEventListener) {
				obj.addEventListener(evt, fn, false);
			} else if (obj.attachEvent) {
				obj.attachEvent('on' + evt, fn);
			}
		}
		/**
		 * Unsets an event meant to trigger on the object and call the function
		 * specified.
		 * @author Peter-Paul Koch <http://quirksmode.org/>
		 * @see http://www.quirksmode.org/js/eventSimple.html
		 * @param {Node} obj element to attach event.
		 * @param {string} evt JS event name, not prefixed by 'on'.
		 * @param {function(Event)} fn function to call when event triggers.
		 */
		function removeEventSimple(obj, evt, fn) {
			if (obj.removeEventListener) {
				obj.removeEventListener(evt, fn, false);
			} else if (obj.detachEvent) {
				obj.detachEvent('on' + evt, fn);
			}
		}
		/**
		 * Cross browser solution to get the Event Target.
		 * @param {Event} evt The Event.
		 * @return {Node} The element that was the target of the event.
		 */
		function getTarget(evt) {
			if (!evt) { evt = window.event; }
			var trgt = evt.target || evt.srcElement || document;
			if (trgt.nodeType === 3) { trgt = trgt.parentNode; }	// defeat Safari bug
			return trgt;
		}
		/**
		 * Cross browser handling of the DOM ready status. Once the DOM is ready
		 * manipulation can begin.
		 * @author John Resig http://jquery.com/
		 * @param {function()} fn function to call when DOM is ready.
		 */
		function bindDOMReady(fn) {
			// Flag for this specific function call to determine if the event has
			// already triggered
			var _DOM_ready = false,
				toplevel = false,
				wfn, cleanup_wfn;

			// Wrapper function to only call the event function once.
			wfn = function() {
				if (!_DOM_ready) {
					// Make sure body exists, from jQuery #5443.
					if (!document.body) {
						return setTimeout(wfn, 1);
					}

					_DOM_ready = true;
					fn();
				}
			};

			if (document.addEventListener) {

				// Cleanup Function to remove the event and then call the wrapper function.
				cleanup_wfn = function() {
					document.removeEventListener('DOMContentLoaded', cleanup_wfn, false);
					wfn();
				};
				document.addEventListener('DOMContentLoaded', cleanup_wfn, false);

			} else if (document.attachEvent) {

				// Cleanup Function to check for complete state then remove the
				// event and then call the wrapper function.
				cleanup_wfn = function() {
					// IE sets the readyState indicate DOM loading completeness
					if (document.readyState === 'complete') {
						document.detachEvent('onreadystatechange', cleanup_wfn);
						wfn();
					}
				};
				document.attachEvent('onreadystatechange', cleanup_wfn);

				// Alternative method to detect DOM ready for non-frames from jQuery
				// If IE and not a frame continually check to see if the document is ready
				try {
					toplevel = window.frameElement === null;
				} catch (e) {}

				if (document.documentElement.doScroll && toplevel) {
					(function doScrollCheck() {
						if (_DOM_ready) { return; }

						try {
							// If IE is used, use the trick by Diego Perini
							// http://javascript.nwbox.com/IEContentLoaded/
							document.documentElement.doScroll('left');
						} catch (e) {
							// Recursively call this function
							setTimeout(doScrollCheck, 1);
							return;
						}

						// and execute the event function
						wfn();
					}());
				}

			}

			// Fall Back to On Load Event
			addEventSimple(window, 'load', wfn);
		}

		return {
			on: addEventSimple,
			off: removeEventSimple,
			trgt: getTarget,
			ready: bindDOMReady
		};
	}());

	/**
	 * Creates Timer objects
	 * @author J Rob Gant <rgant@sitespect.com>
	 * @type {Function}
	 * $Id: ss-timer.js 13405 2011-04-25 14:30:36Z rgant $
	 */
	SS.TimerFactory = (function() {
		/**
		 * @class Calculates the difference in seconds between a start & stop point.
		 * @constructor
		 */
		function Timer() {
			/**
			 * Unix timestamp in ms.
			 * @private
			 * @type {number} integer
			 */
			var _start_ts = -1,
			/**
			 * Unix timestamp in ms.
			 * @private
			 * @type {number} integer
			 */
				_stop_ts = -1;

			/**
			 * Records the start timestamp.
			 * @param {Date=} start_date Date Object to use for start time.
			 * @return {boolean} successfully recorded the timestamp.
			 */
			function start(start_date) {
				_start_ts = (start_date || new Date()).getTime();
				return (_start_ts > 0);
			}
			/**
			 * Records the stop timestamp.
			 * @return {boolean} successfully recorded the timestamp.
			 */
			function stop() {
				_stop_ts = new Date().getTime();
				return (_stop_ts > 0);
			}
			/**
			 * Resets both the start and stop times to default value.
			 */
			function reset() {
				_start_ts = -1;
				_stop_ts = -1;
			}
			/**
			 * Calculates the difference in seconds between the start & stop time.
			 * @throws Failure to Start Timer
			 * @throws Failure to Stop Timer
			 * @throws Failure to Reset Timer
			 * @return {number} float.
			 */

			function getSecondsElapsed() {
				if (_start_ts <= 0) { throw ('Failure to Start Timer'); }
				if (_stop_ts <= 0) { throw ('Failure to Stop Timer'); }
				if (_start_ts > _stop_ts) { throw ('Failure to Reset Timer'); }

				return (_stop_ts - _start_ts) / 1000;
			}

			return {
				start: start,
				stop: stop,
				reset: reset,
				diff: getSecondsElapsed
			};
		}

		/**
		 * Returns a new Timer.
		 * @return {Timer} new instance of Timer.
		 */
		function getNewTimer() { return new Timer(); }

		return { get: getNewTimer };
	}());

	/**
	 * Event Tracking using SiteSpect Reponse Points triggered off of a sub-request
	 * to the server
	 * @author J Rob Gant <rgant@sitespect.com>
	 * @type {Function}
	 * $Id: ss-event-track.js 15307 2011-10-04 19:53:14Z rgant $
	 */
	SS.EventTrack = (function () {
		/**
		 * Trigger URL domain
		 * @const
		 * @private
		 * @type {string}
		 */
		var _domain = window.location.host,
		/**
		 * Trigger URL protocol /(http:|https:)/
		 * @const
		 * @private
		 * @type {string}
		 */
			_protocol = window.location.protocol,
		/**
		 * Trigger URL path
		 * An absolute URL (begins with /)
		 * @const
		 * @private
		 * @type {string}
		 */
			_path = "/__ssobj/track",
		/**
		 * Random Number
		 * @const
		 * @private
		 * @type {number}
		 */
			_rnd = Math.floor(Math.random() * 99999999),
		/**
		 * List of Requests Made
		 * @type {Array.<Object>}
		 */
			requests = [];

		/**
		 * Preserve this Object so that it accessible in the global scope.
		 * Might delay things long enough for the request to be made
		 * @private
		 * @param {Object} req Track request to remember.
		 */
		function _rememberRequest(req) { requests.push(req); }
		/**
		 * Send request to the server by inserting an HTML img tag into the document.
		 * Requests made using this function will have '-3' appended to the URL for
		 * identification. The tag is assigned an ID and retrieved from the DOM to
		 * confirm that it has been inserted correctly.
		 * @private
		 * @param {string} evt_url Response Point to trigger.
		 */
		function _createImageTag(evt_url) {
			evt_url += '-3';	// Identify this as an Image Tag Hit
			var img_el = document.createElement("img");

			img_el.src = evt_url;
			img_el.id = 'SS.IMG' + _rnd;

			document.body.appendChild(img_el);

			// Test that the tag was actually included, might delay things long
			// enough for the request to be made.
			_rememberRequest(img_el);
		}
		/**
		 * Generates a unique request URL for this event & value
		 * If the parameters passed are lists then build a multi-param URL
		 * @private
		 * @param {(string|Array)} evt name of the event to track.
		 * @param {(string|Object)=} val Associative Array of numbers (optional).
		 * @return {string} URL.
		 */
		function _getEventUrl(evt, val) {
			var rnd = (new Date().getTime()) + _rnd,
				val_arr = [],
				i;
			if (typeof evt === 'object') {
				for (i = 0; i < evt.length; i++) {
					evt[i] = 'event' + i + '=' + encodeURIComponent(evt[i]);
				}
				evt = evt.join('&');
			} else {
				evt = 'event=' + encodeURIComponent(evt);
			}

			if (val && typeof val === 'object') {
				for (i in val) {
					if (val.hasOwnProperty(i)) {
						val_arr[val_arr.length] = 'value_' + encodeURIComponent(i) + '=' + encodeURIComponent(val[i]);
					}
				}
				val = val_arr.join('&');
			} else {
				// jslint ignore, null == undefined != (0 || "")
				val = 'value=' + encodeURIComponent(val !== null ? val : '');
			}

			// Default to only specifying path
			var url = _path + '?' + evt + '&' + val + '&x=' + rnd;

			var need_protocol = _protocol !== window.location.protocol;

			if ( isCrossDomain() || need_protocol ) {
				// We need to specify the domain (but protocol may not be required)
				url = '//' + _domain + url;

				if ( need_protocol ) {
					// We need to specify the protocol, too
					url = _protocol + url;
				}
			}

			return url;
		}

		/**
		 * Sets _domain and _protocol based on the URL passed in. Can be anything from just a domain name up to a full
		 * URL including protocol and port. If protocol isn't set, _protocol will not be changed.
		 * @param {string} url URL to parse for new domain and protocol
		 */
		function setDomain(url) {
			var match = url.match(/^(?:(https?:)?\/\/)?([^\/]+)/);

			if ( !match ) { return; }

			// new_protocol will be undefined if the URL didn't contain a protocol
			var new_protocol = match[1];
			var new_domain = match[2];

			_domain = new_domain;
			_protocol = new_protocol || _protocol;
		}

		/**
		 * Send request to the server using AJAX. Requests made using this function
		 * will have '-1' appended to the URL for identification. The request object
		 * is added to the global scope if successful.
		 * @private
		 * @param {string} evt_url Response Point to trigger.
		 * @param {boolean=} sync Set to true to force the call to be synchronous
		 * @return {boolean} AJAX success.
		 */
		function _ajaxTrigger(evt_url, sync) {
			evt_url += '-1';	// Identify this as an AJAX Hit

			// Attempt to make an AJAX Request Object
			var req;
			try {
				req = window.ActiveXObject ?
					new window.ActiveXObject('Microsoft.XMLHTTP') : new window.XMLHttpRequest();
				req.open('GET', evt_url, !sync);
			} catch (e) {
				return false;
			}

			try {
				// These headers identify the request as an AJAX request & tell the
				// server we will accept any result MIME type
				req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
				req.setRequestHeader('Accept', '*/*');
			} catch (e2) {}

			try {
				req.send(null);
			} catch (e3) {
				// Ignore IE 204 "Operation Aborted" bogus error.
				// IE0013 (http://www.enhanceie.com/ie/bugs.asp)
				// Notice that we bit-anded the number property with the 16-bit all-
				// one word. The Error number property is saved in the lower 16-bit
				// word.
				if (e3.number & 0xFFFF !== 1223) {
					return false;
				}
			}

			_rememberRequest(req);
			return true;
		}

		/**
		 * Send request to the server using a JS Image Object. Requests made using
		 * this function will have '-2' appended to the URL for identification. The
		 * request object is added to the global scope if successful.
		 * @private
		 * @param {string} evt_url Response Point to trigger.
		 */
		function _jsImageTrigger(evt_url) {
			evt_url += '-2';	// Identify this as an JS Image Object Hit
			var req = new Image();
			req.src = evt_url;
			_rememberRequest(req);
		}

		/**
		 * Check if _domain is set to a value other than the current host (including port)
		 * @return {boolean} true if _domain is different from current host
		 */
		function isCrossDomain() {
			return _domain !== window.location.host;
		}

		/**
		 * Send the request to the server using one of the available methods.
		 * @param {string} evt Event Type.
		 * @param {string} val Numeric string, the value of this RP.
		 * @param {boolean} sync Set true to block
		 */
		function trigger(evt, val, sync) {
			var evt_url = _getEventUrl(evt, val);

			// JS Security will not allow cross domain AJAX, the domain names have to
			// be exactly the same to be considered "same origin"
			if (isCrossDomain() || !_ajaxTrigger(evt_url, sync)) {
				// On secure pages, write HTML to the page, otherwise use an img obj
				if (_protocol === 'https:') {
					_createImageTag(evt_url);
				} else {
					_jsImageTrigger(evt_url);
				}
			}
		}

		return {
			rp:		trigger,
			rpAsync:	function(evt, val) {trigger(evt, val, false);},
			rpSync:		function(evt, val) {trigger(evt, val, true);},
			r: 		requests,
			setDomain:	setDomain
		};
	}());

	/**
	 * Creates then starts a Timer to track HTML body event times & trigger
	 * applicable Response Points.
	 * Uses SS.EventTrack, SS.TimerFactory & SS.JSEvents
	 * @author J Rob Gant <rgant@sitespect.com>
	 * @type {Function}
	 * $Id: ss-page-timer.js 13406 2011-04-25 15:37:18Z rgant $
	 */
	SS.PageTimer = (function() {
		/**
		 * @see SS.JSEvents
		 * @private
		 * @type {SS.JSEvents}
		 */
		var _JSEvents = SS.JSEvents,
		/**
		 * Timer to track time until event.
		 * @see SS.TimerFactory
		 * @private
		 * @type {Timer}
		 */
			_timer,
		/**
		 * Successful Timer start.
		 * @private
		 * @type {boolean}
		 */
			_timer_init;

		/**
		 * Returns the event function closure for triggering the event.
		 * Returned function calculates the elapsed time, then triggers the Response
		 * Point if too much time hasn't elapsed.
		 * @private
		 * @param {string} evt RP event name.
		 * @return {Function} Closure to ensure that the timer triggers only once
		 *                      per event.
		 */
		function _getEventFunc(evt, sync) {
			// Flag determining if this event function has been called before
			var timer_triggered = false;

			return function() {
				if (_timer_init && !timer_triggered) {
					timer_triggered = true;
					if (_timer.stop()) {
						try {
							var val = _timer.diff();
							if (val <= 1795) {	// New SS session started every 1800 seconds
								SS.EventTrack.rp(evt, val, sync);
							}
						} catch (e) {}
					}
				}
			};
		}

		/**
		 * If the timer was successfully started then initialize the events to
		 * track page ready, load or unload & then trigger RPs.
		 * @param {string} pg_evnt ready = On DOM Ready event.
		 *                         load = page load event.
		 *                         abandon = unload event that fires before load event.
		 *                         dwell = page unload event.
		 * @param {string} evnt_nm name of the RP to trigger.
		 * @param {Date=} start_date preset start time (optional).
		 * @return {boolean} timer initialized and event set.
		 */
		function configureTimer(pg_evnt, evnt_nm, start_date) {
			_timer = SS.TimerFactory.get();
			_timer_init = _timer.start(start_date);

			if (_timer_init) {
				var set_event = false;

				if (pg_evnt === 'ready') {
					_JSEvents.ready(_getEventFunc(evnt_nm, false));
					set_event = true;
				} else if (pg_evnt === 'load') {
					_JSEvents.on(window, 'load', _getEventFunc(evnt_nm, false));
					set_event = true;
				} else if (pg_evnt === 'dwell') {
					_JSEvents.on(window, 'unload', _getEventFunc(evnt_nm, true));
					set_event = true;
				} else if (pg_evnt === 'abandon') {
					unloadEvent = _getEventFunc(evnt_nm, true);
					_JSEvents.on(window, 'unload', unloadEvent);
					_JSEvents.on(window, 'load', function() {
						_JSEvents.off(window, 'unload', unloadEvent);
					});
					set_event = true;
				}

				return set_event;
			} else {
				return false;
			}
		}

		return { time: configureTimer };
	}());

	/**
	 * Tracks and reports on JavaScript errors on the page
	 * Uses SS.EventTrack
	 * @author Tim Moody <tmoody@sitespect.com>
	 * @author Ian Toltz <itoltz@sitespect.com>
	 * @type {Function}
	 * $Id: ss-page-timer.js 13406 2011-04-25 15:37:18Z rgant $
	 */
	SS.Debug = (function () {
		function enableTracking (options) {
			window.addEventListener("error", logError, false);
		};

		function logError(error) {
			var path = error.filename;

			// Errors caused by files from other domains are listed as scripterror for
			// security reasons
			if ( path.match(/scripterror/i) ) {
				path = 'externaljsfile';
			}

			 SS.EventTrack.rp("js-error", {
			 	path: error.filename,
			 	line: error.lineno,
			 	error: error.message
			 });
		}

		return {
			trackJSErrors: enableTracking
		};
	})();

}(this));
