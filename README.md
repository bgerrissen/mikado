Mikado
=====

**** Casual Message ****

* Moved on to RC3!
* Wiki is becoming a mess, really need to work on documentation for just mikado.js.
* Delaying mikado/home framework and demo till documentation is done.


**** Version ****

*RC3

**** Version History ****

* 19-2-2010 : RC3
** added descriptor argument option to mikado#run
** added descriptor options for module descriptor 'fetch' and 'include'
** fixed bugs related to multiple dependencies in the pending list.
* 24-1-2010 : RC2
* 19-1-2010 : RC1

**** Module (paralel) loader and alternate dependency resolver ****

* Stand alone; no javascript framework dependency.
* Resolves module dependencies at module level.
* Moves domReady checks to module level so you never have to code it at implementation.
* Allows preloading modules.

**** Goals ****

* Tries to Enforce a clean global space.
* Tries to minimize code for implementation.
* Tries to provide better dynamic and asynchronous scaling.
* Tries to keep development simple and more JavaScripty.

Basically, any library that is written like or similar to:

*var LIB = (function(){ /\* CODE \*/ })();*

can be included as a mikado module!

### License ###

Mikado is licensed under the terms of the MIT License, see the included MIT-LICENSE file.

Let me know if you are going to include mikado as a whole or in parts in your framework.
I don't mind, a reference to me would be nice but not needed, I just like to hear from you ;)
Also like to hear from you if you felt inspired by some zany idea I had and went off to build 
something better ;)

Disclaimer: My code and ideas should ONLY be used at your own responsibility, I am but one man
and cannot be expected to keep everything up to date without backing of peers or community.
