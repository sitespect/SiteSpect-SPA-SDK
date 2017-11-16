# SiteSpect SPA SDK
SiteSpect JavaScript Library for optimizing React, Angular, and other single page applications. 

The SPA SDK is dynamically injected into the HTML page by SiteSpect as one minified script that is less than 5kb gzipped. You can see a live version <a href="http://www.sitespect.com/__ssobj/core.js+ssdomvar.js+generic-adapter.js">here</a>. The library is split into 3 smaller libraries:
- <a href="https://github.com/sitespect/SiteSpect_SPA_SDK/blob/master/generic-adapter-debug.js">GenericAdapter</a> - Library that uses Mutation Observers to identify when changes should be applied. 
- <a href="https://github.com/sitespect/SiteSpect_SPA_SDK/blob/master/ssdomvar-debug.js">SSDomVar</a> - Library that evaluates client side variations, triggers, and applies changes.
- <a href="https://github.com/sitespect/SiteSpect_SPA_SDK/blob/master/core-debug.js">EventTrack</a> - Library that captures client side events and sends data to SiteSpect in order to populate metrics.

In SiteSpect, assignment occurs on the inital request (based on audience/targeting rules) and this is when SiteSpect would inject the SPA SDK and client side variations into the HTML page. Client side variations are instructions, stored as a JavaScript variable, that contain the changes you want to apply in your application. These variations can include triggers which define when/where the changes should take place (<a href="https://github.com/sitespect/SiteSpect_SPA_SDK/blob/master/csf_example.js">example</a>).

The SPA SDK library evaluates and applies client side variations using Mutation Observers. When a change is applied, SiteSpect is automatically notified and the user is counted in the campaign, inserted into reports, and persists in the expereience based on campaign settings. 
