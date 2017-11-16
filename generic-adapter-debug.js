/* Copyright 2016, SiteSpect, Inc. All Rights Reserved. */
/**
 * @Description: Run a script when there has been content inserted dynamically after a page is loaded.
 * @Gotcha: Be sure to either QA in ie10 and below or exclude those users from your Campaign
 * @Author: Andrew Syriala
 * @Author: Ian Toltz
 * @Created: 11/18/2015
 * @LastModified: 1/4/2016
 **/

if ( ! window.SS ) {
	window.SS = {};
}

SS.SPA = (function () {
	"use strict";

	var classCounter = 1;

	var getAll = document.querySelectorAll.bind(document);

	function dynamicModifyContent(args) {
		var options = {
			'childList' : true,
			'attributes' : true
		};
		var observedObject;
		var observer;
		var modifiedClassName = "ss-modified-" + classCounter++;
		var getTargets = protoGetTargets.bind(null, args.dynamicContainer, modifiedClassName);
		var initMutationObserver;
		var callback = args.callback || args.callbackFunction;

		if ( getAll(args.staticContainer).length > 0 ) {
			//Modern browsers use mutation observers. Modern browsers only exclude IE 10 and below.
			//If Mutation Observers exist, we will use them. Else we will use Mutation Events.
			if (window.MutationObserver) {
				//If flag is set to true set the observer option to watch the static containers entire subtree
				if (args.watchSubtree) {
					options.subtree = true;
				}

				observer = new MutationObserver(executeCallback);
				observedObject = getAll(args.staticContainer)[0];
				initMutationObserver = observer.observe.bind(observer, observedObject, options);

				initMutationObserver();
			} else {
				forEach(getAll(args.staticContainer), addMutationListener);
			}

			//If the args say to run the function now, run the function now.
			if (args.runCallbackNow) {
				callback();
			}
		}

		function addMutationListener(node) {
			node.addEventListener("DOMSubtreeModified", mutationEventCallback, false);
		}

		function removeMutationListener(node) {
			node.removeEventListener("DOMSubtreeModified", mutationEventCallback, false);
		}

		function executeCallback() {
			if ( observer ) {
				observer.disconnect();
			}

			var unmodifiedItems = getTargets(true);

			if (unmodifiedItems.length > 0) {
				forEach(unmodifiedItems, addClass.bind(null, modifiedClassName));

				callback();
			}

			if ( initMutationObserver ) {
				initMutationObserver();
			}
		}

		function mutationEventCallback() {
			//Flag each dynamic item as modified. Run the script if the dynamic containers are not modified
			//We have to unbind the DOMSubtreeModified Event to prevent our callback function from triggering the event.
			forEach(getAll(args.staticContainer), removeMutationListener);

			executeCallback();

			forEach(getAll(args.staticContainer), addMutationListener);
		}
	}

	function protoGetTargets(targetClassName, modifiedClassName, unmodifiedOnly) {
		var selector = [ targetClassName ];

		if (unmodifiedOnly) { selector.push(":not(." + modifiedClassName + ")"); }

		return getAll(selector.join(""));
	}

	function forEach(arr, func) {
		[].forEach.call(arr, func);
	}

	function addClass(className, node) {
		if ( node.className.indexOf(className) === -1 ) {
			node.className += " " + className;
		}
	}

	function registerCSF() {
		/* global ss_dom_var */
		if ( ! window.ss_dom_var ) { return; }

		ss_dom_var.registerVariationWatcher(watchCSFVariations);
	}

	function watchCSFVariations(variations) {
		variations.forEach(function (variation) {
			dynamicModifyContent({
				staticContainer: "html",
				dynamicContainer: variation.selector,
				callback: ss_dom_var.applySingleVariation.bind(ss_dom_var, variation),
				runCallbackNow: false,
				watchSubtree: true
			});
		});
	}

	if ( window.ss_dom_var ) {
		registerCSF();
	}

	return {
		dynamicModify: dynamicModifyContent
	};
}());
