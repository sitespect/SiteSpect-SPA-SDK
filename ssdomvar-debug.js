/* Copyright 2017, SiteSpect, Inc. All Rights Reserved. */
var ss_dom_var = (function () {
	/* exported ss_dom_var */
	"use strict";

	// If any variation tries to apply more than MAX_APPLICATIONS times in THROTTLE_TIME ms, we'll abort and warn
	// the user of a possible infinite loop.
	var MAX_APPLICATIONS = 1000;
	var THROTTLE_TIME = 1000;

	var variations = [];
	var timestamps = {};
	var checkCriteria;
	var ping;
	var asmtRequest;
	var asmtCallback;
	var ve_override = false;
	var variationWatchers = [];
	var variations_applied = {};
	var variations_by_target = [];
	var target_indices = [];
	var observer;
	var counted_tcs = {};
	var observer_options = {
		childList: true,
		attributes: true,
		characterData: true,
		subtree: true,
	};
	var flag_attr = "data-ss-variation-applied";

	var asmtCallbackDefault = function (ret) {
		var SS = window.SS || {};
		SS.getAsmtData = function (){ return ret; };
		window.SS = SS;
	};
	// setup SS.getAsmtData so it's not undefined
	// in the case of no variations applying
	asmtCallbackDefault();

	// Handles everything related to applying variations
	var applySingleVariation = (function () {
		// Set up mutation observer
		try {
			observer = new MutationObserver(mutationsOccurred);
		} catch (ex) {}

		function mutationsOccurred(mutation_records) {
			mutation_records.forEach(function (mutation) {
				var target = getNormalizedMutationTarget(mutation.target);

				// Check to make sure the target is an element on the page
				if ( !ve_override && document.body.contains(target) ) {
					var variations_to_apply = findVariationsForTarget(target);
					if ( variations_to_apply ) {
						variations_to_apply.forEach(function (variation) {
							executeVariation(target, variation);
						});
					}
				}
			});

			cleanup();
		}

		// The MutationObserver will fire on changes to the actual target's subtree, including text nodes and
		// such. This function will search up the DOM tree from the actual target of the event to find the
		// nearest element node which our library is monitoring; if we get all the way up to the root without
		// finding a target we're monitoring, we'll instead just choose the nearest element node
		function getNormalizedMutationTarget(target) {
			var fallback;
			var candidate = target;

			while ( candidate ) {
				if ( candidate.nodeType === Node.ELEMENT_NODE ) {
					// This node is a viable fallback, so if we don't have a fallback yet set it
					fallback = fallback || candidate;

					if (
						candidate.getAttribute(flag_attr)
						|| ( target_indices.indexOf(target) > -1 )
					) {
						// This is the closest element node we're tracking
						return candidate;
					}
				}

				// Continue searching up the tree
				candidate = candidate.parentNode;
			}

			return fallback;
		}

		// Go through all the targets we're watching and, if they're no longer on the page, stop watching them.
		function cleanup() {
			target_indices.forEach(function (target, index) {
				if ( !document.body.contains(target) ) {
					delete target_indices[index];
					delete variations_by_target[index];
				}
			});
		}

		function applyHtmlChange(target, html) {
			target.innerHTML = html;
		}

		function applyCssChange(target, props) {
			Object.keys(props).forEach(function (prop) {
				target.style[prop] = props[prop];
			});
		}

		function applyAttributesChange(target, atts) {
			Object.keys(atts).forEach(function (att) {
				target.setAttribute(att, atts[att]);
			});
		}

		function applyCustomChange(target, code) {
			/* jshint evil: true */
			try {
				var customFunc,
					funcCode = "customFunc = function () {" + code + "}";
				eval(funcCode);

				// Target will be accessible as "this" in the scope of the custom function
				customFunc.apply(target);
			} catch (ex) {
				return false;
			}
		}

		function applyVariation(variation) {
			if ( ! variation.selector ) {
				return 0;
			}

			if ( ! checkCriteria(variation) ) {
				return 0;
			}

			var targets = document.querySelectorAll( variation.selector );
			var changes_made = 0;
			var i;

			for ( i = 0; i < targets.length; i++ ) {
				changes_made += registerVariation(targets[i], variation);
			}

			return changes_made;
		}

		function findVariationsForTarget(target) {
			// Get the index for this target's variations from the attribute. If the attribute
			// doesn't exist on the target, check for the element in the target_indices array in
			// case something is removing the attribute so we don't keep setting up tons of new
			// arrays of variations. If we really don't have a record of it, then grab a new index
			// for it
			var variations_index = target.getAttribute(flag_attr);
			if ( variations_index === null ) {
				variations_index = target_indices.indexOf(target);

				if ( variations_index === -1 ) {
					variations_index = target_indices.length;
					target_indices[variations_index] = target;

					// Set up observer since this is a new target
					// if this is a visual editor session, don't fire changes
					// from the mutation observer
					if ( observer && !ve_override ) {
						observer.observe(target, observer_options);
					}
				}

				target.setAttribute(flag_attr, variations_index);
			}

			// Get the array of variations at the specified index. If the array doesn't exist yet,
			// instantiate it.
			var these_variations = variations_by_target[variations_index];
			if ( !these_variations ) {
				these_variations = variations_by_target[variations_index] = [];
			}

			return these_variations;
		}

		// Registers a variation to a target. If it wasn't already registered to that target, it's
		// also applied immediately.
		function registerVariation(target, variation) {
			var these_variations = findVariationsForTarget(target);

			// If the variation isn't already associated with this target, associate it
			if ( these_variations.indexOf(variation) === -1 ) {
				these_variations.push(variation);

				// When we first associate the variation, apply it as well.
				return executeVariation(target, variation);
			}

			return 0;
		}

		function executeVariation(target, variation) {
			var target_cloned;

			var timestamp = (new Date).getTime();
			var remove_index = 0;

			// To try and prevent infinite loops, we'll limit how often variations can be applied
			while (
				remove_index < variation.applied.length
				&& (variation.applied[remove_index] + THROTTLE_TIME < timestamp)
			) {
				remove_index++;
			}

			variation.applied.push(timestamp);

			if (remove_index) {
				variation.applied.splice(0, remove_index);
			}

			if ( variation.applied.length >= MAX_APPLICATIONS ) {
				console.warn("Possible infinite loop detected, aborting");
				return 0;
			}

			if ( ve_override ) {
				target_cloned = target.ss_revert || target.cloneNode(true);
			}

			if (variation.html) {
				applyHtmlChange(target, variation.html);
			}

			if (variation.css) {
				applyCssChange(target, variation.css);
			}

			if (variation.attributes) {
				applyAttributesChange(target, variation.attributes);
			}

			if (variation.custom) {
				applyCustomChange(target, variation.custom);
			}

			// All the modifications we do, including setting attribute, will cause additional mutation
			// events to fire. In order to prevent an infinite loop, we now flush the records from the
			// observer.
			if ( observer ) {
				observer.takeRecords();
			}

			if ( !!ve_override ) {
				// If the custom change uses this.outerHTML (which is used in VE HTML edits)
				// the target is no longer the same. Therefore we get the element found by
				// the selector after the custom changes have completed.
				var new_target = document.querySelector(variation.selector);
				if ( !!new_target ) {
					// if the new_target doesn't have the special "applied variation" flag
					// we set the attribute from the original target
					if ( !new_target.hasAttribute(flag_attr) && target.hasAttribute(flag_attr) ) {
						new_target.setAttribute(flag_attr, target.getAttribute(flag_attr));
					}

					if ( !!target_cloned ) {
						new_target.ss_revert = target_cloned;
					}
				}
			}

			return 1;
		}

		function setVariationPreview(variation_id, changes_count) {
			if ( ! variations_applied[variation_id] ) {
				variations_applied[variation_id] = changes_count > 0;
			}
			var preview_applied_selector = "#ssp_history_panel .ss_csf_applied_" + variation_id;
			var preview_applied_elements = document.querySelectorAll( preview_applied_selector );
			for ( var i = 0; i < preview_applied_elements.length; i++ ) {
				if ( variations_applied[variation_id] ) {
					preview_applied_elements[i].style.display = "block";
				}
				else {
					preview_applied_elements[i].style.display = "none";
				}
			}
		}

		function throttle(fn, threshhold, scope) {
			var last,
			deferTimer;
			return function () {
				var context = scope || this;

				var now = +new Date(),
				args = arguments;
				if (args[0]) {
					threshhold = args[0];
				}
				if (last && now < last + threshhold) {
					// hold on to it
					clearTimeout(deferTimer);
					deferTimer = setTimeout(function () {
						last = now;
						fn.apply(context, args);
					}, threshhold);
				} else {
					last = now;
					fn.apply(context, args);
				}
			};
		}

		return function (variation) {
			var changes_made = 0;

			// reset variation applied
			delete variations_applied[variation.id];

			var changes_made = applyVariation(variation);

			if ( changes_made ) {
				if (
					! variation.counted &&
					variation.trigger_counted &&
					! counted_tcs[variation.campaign_id]
				) {
					variation.counted = true;
					counted_tcs[variation.campaign_id] = true;
				}
				if ( typeof asmtCallback !== 'function' ) {
					asmtCallback = asmtCallbackDefault;
				}
				asmtRequest(asmtCallback,counted_tcs);
			};

			setVariationPreview(variation.id, changes_made);
			
			return changes_made;
		};
	}());

	function applyVariations(variations_list) {
		// If we're not passed anything, apply all variations
		if ( !(variations_list instanceof Array) ) {
			variations_list = variations;
		}

		var changes_made = variations_list
			.map(applySingleVariation)
			.reduce(function (sum, current) {
				return sum + current;
			}, 0);

		return changes_made;
	}

	// Handles everything related to checking criteria of variations
	checkCriteria = (function () {
		function checkCriterionCustom(criterion) {
			/* jshint evil: true */
			try {
				var customFunc,
					funcCode = "customFunc = function () {" + criterion.script_criterion + "}";
				eval(funcCode);

				return customFunc();
			} catch (ex) {
				return false;
			}
		}

		function checkCriterionHash(criterion) {
			return !!document.location.hash.match(new RegExp(criterion.hash_criterion));
		}

		function checkCriterionHashQuery(criterion) {
			// Adding 1 to the index chops off the question mark if it exists, or makes index 0 (falsy) if it
			// doesn't
			var index = document.location.hash.indexOf("?") + 1,
				parts = [];

			if ( index ) {
				parts = document.location.hash.substring(index).split("&");
			}

			return checkForKeyValuePair(criterion.hashquery_name_criterion, criterion.hashquery_value_criterion, parts);
		}

		function checkCriterionPath(criterion) {
			return !!document.location.pathname.match(new RegExp(criterion.path_criterion));
		}

		function checkCriterionQuery(criterion) {
			var parts = document.location.search.substring(1).split("&");

			return checkForKeyValuePair(criterion.query_name_criterion, criterion.query_value_criterion, parts);
		}

		function checkForKeyValuePair(criterion_key, criterion_value, candidates) {
			var key_regex = new RegExp(criterion_key),
				value_regex = new RegExp(criterion_value),
				i,
				split,
				value;

			for ( i = 0; i < candidates.length; i++ ) {
				split = candidates[i].split("=");

				if ( split.shift().match(key_regex) ) {
					// We've shifted the key out, now we need to join the remaining elements in case there
					// was an equals sign in the value. It also neatly handles the case where there is no
					// value by ensuring we at least have the empty string
					value = split.join("=");

					if ( value.match(value_regex) ) {
						return true;
					}
				}
			}

			return false;
		}

		return function (variation) {
			var i,
				crit,
				dispatch = {
					Path:      checkCriterionPath,
					Hash:      checkCriterionHash,
					Query:     checkCriterionQuery,
					HashQuery: checkCriterionHashQuery,
					Custom:    checkCriterionCustom,
				};

			for ( i = 0; i < variation.criteria.length; i++ ) {
				crit = variation.criteria[i];

				if ( ! (dispatch[crit.Type] && dispatch[crit.Type](crit)) ) {
					return false;
				}
			}

			return true;
		};
	}());

	asmtRequest = engineRequest("/__ssobj/asmt_update");
	// Handles requests, throttling them so that we don't ping more often than every 100ms
	function engineRequest(target) {
		var timeout_id,
			delay = 100,
			payloadObj,
			dataHandler;

		function flushQueue() {
			reset();
			var payload = JSON.stringify(payloadObj),
				xhr = new XMLHttpRequest();
			xhr.open("POST", target);
			xhr.setRequestHeader("Context-Type", "application/json;charset=UTF-8"); // TODO Do I want this charset?
			xhr.addEventListener("load", handleResponse, false);
			xhr.send(payload);
		}

		function handleResponse(evt) {
			var data;
			try {
				data = JSON.parse( evt.target.response );
				if ( typeof dataHandler === 'function' ) {
					dataHandler(data);
				}
			}
			catch (ex) {

			}
		}

		function initializePing(force) {
			if ( force && timeout_id ) {
				reset();
			} else if ( timeout_id ) {
				// A ping's already waiting and we don't want to override it
				return;
			}

			timeout_id = setTimeout(flushQueue, delay);
		}

		function reset() {
			clearTimeout(timeout_id);
			timeout_id = null;
		}

		return function (handler,payload) {
			dataHandler = handler;
			payloadObj = payload;
			if ( !timeout_id ) {
				initializePing();
			}
		};
	}

	function setVariations(a) {
		if (a) {
			variations = a.variations || variations;
			timestamps = a.timestamps || timestamps;
			ve_override = !!a.is_ve_preview;
		}

		variations.forEach(function (variation) {
			// For detecting infinite loops, we keep track of when each variation was applied
			variation.applied = variation.applied || [];
		});

		variationWatchers.forEach(function (callback) {
			callback(variations);
		});
	}

	function registerVariationWatcher(callback) {
		variationWatchers.push(callback);

		callback(variations);
	}

	function checkVariationApplied(variation_id) {
		if( variations_applied.hasOwnProperty(variation_id) ) {
			return variations_applied[variation_id];
		}
		else {
			return false;
		}
	}

	function setAsmtCallback (callback) {
		asmtCallback = callback;
	}

	setVariations(window.__ss_variations);

	document.addEventListener("ready", function () {
		if ( !variations.length ) {
			setVariations(window.__ss_variations);
		}
	}, false);

	return {
		applyVariations: applyVariations,
		applySingleVariation: applySingleVariation,
		setVariations: setVariations,
		registerVariationWatcher: registerVariationWatcher,
		checkVariationApplied: checkVariationApplied,
		setAsmtCallback: setAsmtCallback
	};
}());
