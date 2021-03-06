/** DOMTokenList polyfill */
(function(){
	"use strict";
	
	/*<*/
	var UNDEF,
	WIN   = window,
	DOC   = document,
	OBJ   = Object,
	NULL  = null,
	TRUE  = true,
	FALSE = false,
	/*>*/
	
	/** Munge the hell out of our string literals. Saves a tonne of space after compression. */
	SPACE           = " ",
	ELEMENT         = "Element",
	CREATE_ELEMENT  = "create"+ELEMENT,
	DOM_TOKEN_LIST  = "DOMTokenList",
	DEFINE_GETTER   = "__defineGetter__",
	DEFINE_PROPERTY = "defineProperty",
	CLASS_          = "class",
	LIST            = "List",
	CLASS_LIST      = CLASS_+LIST,
	REL             = "rel",
	REL_LIST        = REL+LIST,
	DIV             = "div",
	LENGTH          = "length",
	CONTAINS        = "contains",
	APPLY           = "apply",
	HTML_           = "HTML",
	METHODS         = ("item "+CONTAINS+" add remove toggle toString toLocaleString").split(SPACE),
	ADD             = METHODS[2],
	REMOVE          = METHODS[3],
	TOGGLE          = METHODS[4],
	PROTOTYPE       = "prototype",
	
	
	
	/** Ascertain browser support for Object.defineProperty */
	dpSupport       = DEFINE_PROPERTY in OBJ || DEFINE_GETTER in OBJ[ PROTOTYPE ] || NULL,
	
	
	/** Wrapper for Object.defineProperty that falls back to using the legacy __defineGetter__ method if available. */
	defineGetter    = function(object, name, fn, configurable){
		if(OBJ[ DEFINE_PROPERTY ])
			OBJ[ DEFINE_PROPERTY ](object, name, {
				configurable: FALSE === dpSupport ? TRUE : !!configurable,
				get:          fn
			});
		
		else object[ DEFINE_GETTER ](name, fn);
	},
	
	
	
	
	/** DOMTokenList interface replacement */
	DOMTokenList = function(el, prop){
		var THIS    = this,
		
		/** Private variables */
		tokens      = [],
		tokenMap    = {},
		length      = 0,
		maxLength   = 0,
		
		
		reindex     = function(){
			
			/** Define getter functions for array-like access to the tokenList's contents. */
			if(length >= maxLength)
				for(; maxLength < length; ++maxLength) (function(i){
					
					defineGetter(THIS, i, function(){
						preop();
						return tokens[i];
					}, FALSE);
					
				})(maxLength);
		},
		
		
		
		/** Helper function called at the start of each class method. Internal use only. */
		preop = function(){
			var error, i,
			args    = arguments,
			rSpace  = /\s+/;
			
			/** Validate the token/s passed to an instance method, if any. */
			if(args[ LENGTH ])
				for(i = 0; i < args[ LENGTH ]; ++i)
					if(rSpace.test(args[i])){
						error       = new SyntaxError('String "' + args[i] + '" ' + CONTAINS + ' an invalid character');
						error.code  = 5;
						error.name  = "InvalidCharacterError";
						throw error;
					}
			
			
			/** Split the new value apart by whitespace*/
			tokens = ("" + el[prop]).replace(/^\s+|\s+$/g, "").split(rSpace);
			
			/** Avoid treating blank strings as single-item token lists */
			if("" === tokens[0]) tokens = [];
			
			/** Repopulate the internal token lists */
			tokenMap = {};
			for(i = 0; i < tokens[ LENGTH ]; ++i)
				tokenMap[tokens[i]] = TRUE;
			length = tokens[ LENGTH ];
			reindex();
		};
		
		
		
		/** Populate our internal token list if the targeted attribute of the subject element isn't empty. */
		preop();
		
		
		
		/** Return the number of tokens in the underlying string. Read-only. */
		defineGetter(THIS, LENGTH, function(){
			preop();
			return length;
		});
		
		
		/** Override the default toString/toLocaleString methods to return a space-delimited list of tokens when typecast. */
		THIS[ METHODS[6] /** toLocaleString */ ] =
		THIS[ METHODS[5] /** toString       */ ] = function(){
			preop();
			return tokens.join(SPACE);
		};
		
		
		
		/** Return an item in the list by its index (or undefined if the number is greater than or equal to the length of the list) */
		THIS.item = function(idx){
			preop();
			return tokens[idx];
		};
		
		
		/** Return TRUE if the underlying string contains `token`; otherwise, FALSE. */
		THIS[ CONTAINS ] = function(token){
			preop();
			return !!tokenMap[token];
		};
		
		
		
		/** Add one or more tokens to the underlying string. */
		THIS[ADD] = function(){
			preop[APPLY](THIS, args = arguments);

			for(var args, token, i = 0, l = args[ LENGTH ]; i < l; ++i){
				token = args[i];
				if(!tokenMap[token]){
					tokens.push(token);
					tokenMap[token] = TRUE;
				}
			}
			
			/** Update the targeted attribute of the attached element if the token list's changed. */
			if(length  !== tokens[ LENGTH ]){
				length   = tokens[ LENGTH ] >>> 0;
				el[prop] = tokens.join(SPACE);
				reindex();
			}
		};
		
		
		
		/** Remove one or more tokens from the underlying string. */
		THIS[ REMOVE ] = function(){
			preop[APPLY](THIS, args = arguments);
			
			/** Build a hash of token names to compare against when recollecting our token list. */
			for(var args, ignore = {}, i = 0, t = []; i < args[ LENGTH ]; ++i){
				ignore[args[i]] = TRUE;
				delete tokenMap[args[i]];
			}
			
			/** Run through our tokens list and reassign only those that aren't defined in the hash declared above. */
			for(i = 0; i < tokens[ LENGTH ]; ++i)
				if(!ignore[tokens[i]]) t.push(tokens[i]);
			
			tokens   = t;
			length   = t[ LENGTH ] >>> 0;
			
			/** Update the targeted attribute of the attached element. */
			el[prop] = tokens.join(SPACE);
			reindex();
		};
		
		
		
		/** Add or remove a token depending on whether it's already contained within the token list. */
		THIS[TOGGLE] = function(token, force){
			preop[APPLY](THIS, [token]);
			
			/** Token state's being forced. */
			if(UNDEF !== force){
				if(force) { THIS[ADD](token);     return TRUE;  }
				else      { THIS[REMOVE](token);  return FALSE; }
			}
			
			/** Token already exists in tokenList. Remove it, and return FALSE. */
			if(tokenMap[token]){
				THIS[ REMOVE ](token);
				return FALSE;
			}
			
			/** Otherwise, add the token and return TRUE. */
			THIS[ADD](token);
			return TRUE;
		};
		
		
		/** Mark our newly-assigned methods as non-enumerable. */
		(function(o, defineProperty){
			if(defineProperty)
				for(var i = 0; i < 7; ++i)
					defineProperty(o, METHODS[i], {enumerable: FALSE});
		}(THIS, OBJ[ DEFINE_PROPERTY ]));
		
		return THIS;
	},
	
	
	
	/** Polyfills a property with a DOMTokenList */
	addProp = function(o, name, attr){
		
		defineGetter(o[PROTOTYPE], name, function(){
			var tokenList,
			THIS = this,
			
			/** Prevent this from firing twice for some reason. What the hell, IE. */
			gibberishProperty           = DEFINE_GETTER + DEFINE_PROPERTY + name;
			if(THIS[gibberishProperty]) return tokenList;
			THIS[gibberishProperty]     = TRUE;
			
			
			/**
			 * IE8 can't define properties on native JavaScript objects, so we'll use a dumb hack instead.
			 *
			 * What this is doing is creating a dummy element ("reflection") inside a detached phantom node ("mirror")
			 * that serves as the target of Object.defineProperty instead. While we could simply use the subject HTML
			 * element instead, this would conflict with element types which use indexed properties (such as forms and
			 * select lists).
			 */
			if(FALSE === dpSupport){
				
				var visage,
				mirror      = addProp.mirror = addProp.mirror || DOC[ CREATE_ELEMENT ](DIV),
				reflections = mirror.childNodes,
				
				/** Iterator variables */
				l = reflections[ LENGTH ],
				i = 0;
				
				for(; i < l; ++i)
					if(reflections[i]._R === THIS){
						visage = reflections[i];
						break;
					}
				
				/** Couldn't find an element's reflection inside the mirror. Materialise one. */
				visage || (visage = mirror.appendChild(DOC[ CREATE_ELEMENT ](DIV)));
				
				tokenList = DOMTokenList.call(visage, THIS, attr);
			}
			
			else tokenList = new DOMTokenList(THIS, attr);
			
			
			defineGetter(THIS, name, function(){ return tokenList; });
			delete THIS[gibberishProperty];
			
			return tokenList;
		}, TRUE);
	},

	/** Variables used for patching native methods that're partially implemented (IE doesn't support adding/removing multiple tokens, for instance). */
	testList,
	nativeAdd,
	nativeRemove;
	
	
	
	
	/** No discernible DOMTokenList support whatsoever. Time to remedy that. */
	if(!WIN[ DOM_TOKEN_LIST ]){
		
		/** Ensure the browser allows Object.defineProperty to be used on native JavaScript objects. */
		if(dpSupport)
			try{ defineGetter({}, "support"); }
			catch(e){ dpSupport = FALSE; }
		
		
		DOMTokenList.polyfill   = TRUE;
		WIN[ DOM_TOKEN_LIST ]   = DOMTokenList;
		
		addProp( WIN[ ELEMENT ], CLASS_LIST, CLASS_ + "Name");      /* Element.classList */
		addProp( WIN[ HTML_+ "Link"   + ELEMENT ], REL_LIST, REL);  /* HTMLLinkElement.relList */
		addProp( WIN[ HTML_+ "Anchor" + ELEMENT ], REL_LIST, REL);  /* HTMLAnchorElement.relList */
		addProp( WIN[ HTML_+ "Area"   + ELEMENT ], REL_LIST, REL);  /* HTMLAreaElement.relList */
	}
	
	
	/**
	 * Possible support, but let's check for bugs.
	 *
	 * Where arbitrary values are needed for performing a test, previous variables
	 * are recycled to save space in the minified file.
	 */
	else{
		testList = DOC[ CREATE_ELEMENT ](DIV)[CLASS_LIST];
		
		/** We'll replace a "string constant" to hold a reference to DOMTokenList.prototype (filesize optimisation, yaddah-yaddah...) */
		PROTOTYPE = WIN[DOM_TOKEN_LIST][PROTOTYPE];
		
		
		/** Check if we can pass multiple arguments to add/remove. To save space, we'll just recycle a previous array of strings. */
		testList[ADD][APPLY](testList, METHODS);
		if(2 > testList[LENGTH]){
			nativeAdd      = PROTOTYPE[ADD];
			nativeRemove   = PROTOTYPE[REMOVE];
			
			PROTOTYPE[ADD] = function(){
				for(var i = 0, args = arguments; i < args[LENGTH]; ++i)
					nativeAdd.call(this, args[i]);
			};
			
			PROTOTYPE[REMOVE] = function(){
				for(var i = 0, args = arguments; i < args[LENGTH]; ++i)
					nativeRemove.call(this, args[i]);
			};
		}
		
		
		/** Check if the "force" option of .toggle is supported. */
		if(testList[TOGGLE](LIST, FALSE))
			PROTOTYPE[TOGGLE] = function(token, force){
				var THIS = this;
				THIS[(force = UNDEF === force ? !THIS[CONTAINS](token) : force) ? ADD : REMOVE](token);
				return !!force;
			};
	}
}());

// Adapted from https://gist.github.com/paulirish/1579671 which derived from 
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller.
// Fixes from Paul Irish, Tino Zijdel, Andrew Mao, Klemen Slavič, Darius Bacon

// MIT license

if (!Date.now)
    Date.now = function() { return new Date().getTime(); };

(function() {
    'use strict';
    
    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
        var vp = vendors[i];
        window.requestAnimationFrame = window[vp+'RequestAnimationFrame'];
        window.cancelAnimationFrame = (window[vp+'CancelAnimationFrame']
                                   || window[vp+'CancelRequestAnimationFrame']);
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) // iOS6 is buggy
        || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
        var lastTime = 0;
        window.requestAnimationFrame = function(callback) {
            var now = Date.now();
            var nextTime = Math.max(lastTime + 16, now);
            return setTimeout(function() { callback(lastTime = nextTime); },
                              nextTime - now);
        };
        window.cancelAnimationFrame = clearTimeout;
    }
}());

// ChildNode.remove
(function () {
  "use strict";

  if(!("remove" in Element.prototype)){
  	Element.prototype.remove = function(){
  		if(this.parentNode) {
  			this.parentNode.removeChild(this);
      }
  	};
  }
})();

// *** gn *** //
var gn = (function (g) {

  // return gn
  return g;
})(window.gn || {});
// extend
// @require "/src/gn/base.js"

gn.extend = function () {
  var obj, name, copy,
  target = arguments[0] || {},
  i = 1,
  length = arguments.length;

  for (; i < length; i++) {
    if ((obj = arguments[i]) !== null) {
      for (name in obj) {
        copy = obj[name];

        if (target === copy) {
          continue;
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }
  return target;
};
// isInViewport
// @require "/src/gn/base.js"

gn.isInViewport = function ( elem ) {
  var rect = elem.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < document.documentElement.clientHeight &&
    rect.left < document.documentElement.clientWidth
    );
};
// indexOf
// @require "/src/gn/base.js"

gn.indexOf = function (array, item) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === item) { return i; }
  }
  return -1;
};
// get supported property
// @require "/src/gn/base.js"

gn.getSupportedProp = function (proparray){
  var root = document.documentElement;
  for (var i=0; i<proparray.length; i++){
    if (proparray[i] in root.style){
      return proparray[i];
    }
  }
};

// var getTD = gn.getSupportedProp(['transitionDuration', 'WebkitTransitionDuration', 'MozTransitionDuration', 'OTransitionDuration']),
// getTransform = gn.getSupportedProp(['transform', 'WebkitTransform', 'MozTransform', 'OTransform']);
// DOM ready
// @require "/src/gn/base.js"

gn.ready = function ( fn ) {

  // Sanity check
  if ( typeof fn !== 'function' ) { return; }

  // If document is already loaded, run method
  if ( document.readyState === 'complete'  ) {
    return fn();
  }

  // Otherwise, wait until document is loaded
  document.addEventListener( 'DOMContentLoaded', fn, false );
};
// isNodeList
// @require "/src/gn/base.js"

gn.isNodeList = function (el) {
  // Only NodeList has the "item()" function
  return typeof el.item !== 'undefined'; 
};

// append
// @require "/src/gn/base.js"
// @require "/src/gn/isNodeList.js"

gn.append = function(els, data) {
  var els_new = (gn.isNodeList(els)) ? els : [els], i;

  if (typeof data.nodeType !== "undefined" && data.nodeType === 1) {
    for (i = els_new.length; i--;) {
      els_new[i].appendChild(data);
    }
  } else if (typeof data === "string") {
    for (i = els_new.length; i--;) {
      els_new[i].insertAdjacentHTML('beforeend', data);
    }
  } else if (gn.isNodeList(data)) {
    var fragment = document.createDocumentFragment();
    for (i = data.length; i--;) {
      fragment.insertBefore(data[i], fragment.firstChild);
    }
    for (var j = els_new.length; j--;) {
      els_new[j].appendChild(fragment);
    }
  }
};


// wrap
// @require "/src/gn/base.js"
// @require "/src/gn/isNodeList.js"

gn.wrap = function (els, obj) {
    var elsNew = (gn.isNodeList(els)) ? els : [els];
  // Loops backwards to prevent having to clone the wrapper on the
  // first element (see `wrapper` below).
  for (var i = elsNew.length; i--;) {
      var wrapper = (i > 0) ? obj.cloneNode(true) : obj,
          el = elsNew[i];

      // Cache the current parent and sibling.
      var parent = el.parentNode,
          sibling = el.nextSibling;

      // Wrap the element (is automatically removed from its current parent).
      wrapper.appendChild(el);

      // If the element had a sibling, insert the wrapper before
      // the sibling to maintain the HTML structure; otherwise, just
      // append it to the parent.
      if (sibling) {
          parent.insertBefore(wrapper, sibling);
      } else {
          parent.appendChild(wrapper);
      }
  }
};


// unwrap
// @require "/src/gn/base.js"
// @require "/src/gn/isNodeList.js"

gn.unwrap = function (els) {
  var elsNew = (gn.isNodeList(els)) ? els : [els];
  for (var i = elsNew.length; i--;) {
    var el = elsNew[i];

    // get the element's parent node
    var parent = el.parentNode;
    
    // move all children out of the element
    while (el.firstChild) { 
      parent.insertBefore(el.firstChild, el); 
    }
    
    // remove the empty element
    parent.removeChild(el);
  }
};
/**
  * tiny-slider
  * @version 1.0.1
  * @author William Lin
  * @license The MIT License (MIT)
  * @github https://github.com/ganlanyuan/tiny-slider/
  */

var tns = (function () {
  'use strict';

  var TRANSFORM = gn.getSupportedProp([
        'transform', 
        'WebkitTransform', 
        'MozTransform', 
        'msTransform',
        'OTransform'
      ]),
      transitions = {
        'transitionDuration': ['transitionDelay', 'transitionend'],
        'WebkitTransitionDuration': ['WebkitTransitionDelay', 'webkitTransitionEnd'],
        'MozTransitionDuration': ['MozTransitionDelay', 'transitionend'],
        'OTransitionDuration': ['OTransitionDelay', 'oTransitionEnd']
      },
      animations = {
        'animationDuration': ['animationDelay', 'animationend'],
        'WebkitAnimationDuration': ['WebkitAnimationDelay', 'webkitAnimationEnd'],
        'MozAnimationDuration': ['MozAnimationDelay', 'animationend'],
        'OAnimationDuration': ['OAnimationDelay', 'oAnimationEnd']
      },
      TRANSITIONDURATION = whichProperty(transitions)[0],
      TRANSITIONDELAY = whichProperty(transitions)[1],
      TRANSITIONEND = whichProperty(transitions)[2],
      ANIMATIONDURATION = whichProperty(animations)[0],
      ANIMATIONDELAY = whichProperty(animations)[1],
      ANIMATIONEND = whichProperty(animations)[2],
      KEY = {
        ENTER: 13,
        SPACE: 32,
        PAGEUP: 33,
        PAGEDOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40
      };
// console.log(
//   TRANSITIONDURATION,
//   TRANSITIONDELAY,
//   TRANSITIONEND,
//   ANIMATIONDURATION,
//   ANIMATIONDELAY,
//   ANIMATIONEND
//   );

  function core (options) {
    options = gn.extend({
      container: document.querySelector('.slider'),
      mode: 'carousel',
      axis: 'horizontal',
      items: 1,
      gutter: 0,
      edgePadding: 0,
      fixedWidth: false,
      slideBy: 1,
      controls: true,
      controlsText: ['prev', 'next'],
      controlsContainer: false,
      nav: true,
      navContainer: false,
      arrowKeys: false,
      speed: 300,
      autoplay: false,
      autoplayTimeout: 5000,
      autoplayDirection: 'forward',
      autoplayText: ['start', 'stop'],
      autoplayHoverPause: false,
      autoplayButton: false,
      animateIn: 'tns-fadeIn',
      animateOut: 'tns-fadeOut',
      animateNormal: 'tns-normal',
      animateDelay: false,
      loop: true,
      autoHeight: false,
      responsive: false,
      lazyload: false,
      touch: true,
      rewind: false
    }, options || {});

    // make sure slide container exists
    if (typeof options.container !== 'object' || options.container === null) {
      return {
        destory: function () {},
        events: events,
      }; 
    }

    // === define and set variables ===
    var mode = options.mode,
        axis = options.axis,
        wrapper = document.createElement('div'),
        contentWrapper = document.createElement('div'),
        container = options.container,
        slideItems = container.children,
        slideCount = slideItems.length,
        items = options.items,
        slideBy = getSlideBy(),
        gutter = options.gutter,
        edgePadding = (mode === 'gallery') ? false : options.edgePadding,
        fixedWidth = options.fixedWidth,
        arrowKeys = options.arrowKeys,
        speed = options.speed,
        rewind = options.rewind,
        loop = (mode === 'gallery')? true: (options.rewind)? false : options.loop,
        autoHeight = (mode === 'gallery') ? true : options.autoHeight,
        responsive = (fixedWidth) ? false : options.responsive,
        lazyload = options.lazyload,
        slideId = container.id || getSlideId(),
        slideWidth = (fixedWidth)? fixedWidth + gutter : 0,
        slideTopEdges, // collection of slide top edges
        slideItemsOut = [],
        cloneCount = (loop) ? slideCount * 2 : (edgePadding) ? 1 : 0,
        slideCountNew = (mode === 'gallery') ? slideCount + cloneCount : slideCount + cloneCount * 2,
        hasRightDeadZone = (fixedWidth && !loop && !edgePadding)? true : false,
        checkIndexBeforeTransform = (mode === 'gallery' || !loop)? true : false,
        // controls
        controls = options.controls,
        controlsText = options.controlsText,
        controlsContainer = (!options.controlsContainer) ? false : options.controlsContainer,
        prevButton,
        nextButton,
        // nav
        nav = options.nav,
        navContainer = options.navContainer || false,
        navItems,
        navCountVisible,
        navCountVisibleCached = slideCount,
        navClicked = -1,
        navCurrent = 0,
        navCurrentCached = 0,
        // index
        index = (mode === 'gallery') ? 0 : cloneCount,
        indexCached = index,
        indexAdjust = (edgePadding) ? 1 : 0,
        indexMin = indexAdjust,
        indexMax,
        vw,
        // autoplay
        autoplay = options.autoplay,
        autoplayTimeout = options.autoplayTimeout,
        autoplayDirection = (options.autoplayDirection === 'forward') ? 1 : -1,
        autoplayText = options.autoplayText,
        autoplayHoverPause = options.autoplayHoverPause,
        autoplayTimer,
        autoplayButton = options.autoplayButton,
        animating = false,
        autoplayHoverStopped = false,
        autoplayHtmlString = '<span hidden>Stop Animation</span>',
        // touch
        touch = options.touch,
        startX = 0,
        startY = 0,
        translateInit,
        disX,
        disY,
        touchStarted,
        // gallery
        animateIn = (ANIMATIONDURATION) ? options.animateIn : 'tns-fadeIn',
        animateOut = (ANIMATIONDURATION) ? options.animateOut : 'tns-fadeOut',
        animateNormal = (ANIMATIONDURATION) ? options.animateNormal : 'tns-normal',
        animateDelay = (ANIMATIONDURATION) ? options.animateDelay : false,
        // resize and scroll
        resizeTimer,
        ticking = false;

    // === COMMON FUNCTIONS === //
    function getSlideBy () {
      return (mode === 'gallery' || options.slideBy === 'page') ? items : options.slideBy;
    }

    var getItems = (function () {
      if (!fixedWidth) {
        return function () {
          var itemsTem = options.items,
              // ww = document.documentElement.clientWidth,
              bpKeys = (typeof responsive === 'object') ? Object.keys(responsive) : false;

          if (bpKeys) {
            for (var i = 0; i < bpKeys.length; i++) {
              if (vw >= bpKeys[i]) { itemsTem = responsive[bpKeys[i]]; }
            }
          }
          return Math.max(1, Math.min(slideCount, itemsTem));
        };

      } else {
        return function () { return Math.max(1, Math.min(slideCount, Math.floor(vw / fixedWidth))); };
      }
    })();

    var getSlideWidth = function () {
      return Math.round((vw + gutter) / items);
    };

    var getVisibleNavCount = (function () {
      if (options.navContainer) {
        return function () { return slideCount; };
      } else {
        return function () { return Math.ceil(slideCount / items); };
      }
    })();

    var getViewWidth = (function () {
      // horizontal carousel: fluid width && edge padding
      //  => inner wrapper view width
      if (axis === 'horizontal' && !fixedWidth && edgePadding) { 
        return function () { return wrapper.clientWidth - (edgePadding + gutter) * 2; };
      // horizontal carousel: fixed width || fluid width but no edge padding
      // vertical carousel
      //  => wrapper view width
      } else {
        return function () { return wrapper.clientWidth; };
      }
    })();

    // compare slide count & items
    // (items) => nav, controls, autoplay
    function checkSlideCount() {
      // a. slide count < items
      //  => disable nav, controls, autoplay
      if (slideCount <= items) { 
        arrowKeys = false;

        var indexTem;
        index = (mode === 'gallery') ? 0 : cloneCount;
        if (index !== indexTem) { events.emit('indexChanged', info()); }

        if (navContainer) { hideElement(navContainer); }
        if (controlsContainer) { hideElement(controlsContainer); }
        if (autoplayButton) { hideElement(autoplayButton); }
      // b. slide count > items
      //  => enable nav, controls, autoplay
      } else {
        arrowKeys = options.arrowKeys;
        if (nav) { showElement(navContainer); }
        if (controls) { showElement(controlsContainer); }
        if (autoplay) { showElement(autoplayButton); }
      }
    }

    // === INITIALIZATION FUNCTIONS === //
    function wrapperInit() {
      setAttrs(wrapper, {'data-tns-role': 'wrapper'});
      setAttrs(contentWrapper, {'data-tns-role': 'content-wrapper'});
      if (axis === 'vertical') { 
        setAttrs(contentWrapper, {'data-tns-hidden': 'y'}); 
      } else {
        setAttrs(wrapper, {'data-tns-hidden': 'x'}); 
      }

      if (mode === 'carousel') {
        var gap = (fixedWidth && edgePadding) ? getFixedWidthEdgePadding() : (edgePadding) ? edgePadding + gutter : 0;
        contentWrapper.style.cssText = (axis === 'horizontal') ? 'margin: 0 ' + gap + 'px;' : 'padding: ' + gap + 'px 0 ' + edgePadding + 'px; height: ' + getVerticalWrapperHeight() + 'px;'; 
      }
    }

    // vw => items => indexMax, slideWidth, navCountVisible, slideBy
    function getVariables() {
      vw = getViewWidth();
      items = getItems();
      indexMax = slideCountNew - items - indexAdjust;

      if (axis === 'horizontal' && !fixedWidth) { slideWidth = getSlideWidth(); }
      navCountVisible = getVisibleNavCount();
      slideBy = getSlideBy();
    }

    function containerInit() {
      // add id
      if (container.id === '') { container.id = slideId; }

      // add attributes
      setAttrs(container, {
        'data-tns-role': 'content', 
        'data-tns-mode': mode, 
        'data-tns-axis': axis
      });

      // init width & transform
      if (mode === 'carousel') {
        if (autoHeight) { setAttrs(container, {'data-tns-hidden': 'y'}); }
        // modern browsers will use 'transform: translateX(Y)'
        // legacy browsers will use 'left | top' 
        var attr = TRANSFORM,
            attrLegacy = 'left',
            tran = 'translate',
            prefix = '',
            postfix = '', 
            dir = 'X',
            distance;

        if (axis === 'horizontal') {
          // init container width
          var width = (slideWidth + 1) * slideCountNew + 'px';
          container.style.width = width;

          distance = -index * slideWidth;
        } else {
          distance = -slideTopEdges[index];
          dir = 'Y';
          attrLegacy = 'top';
        }

        if (TRANSFORM) {
          prefix = tran + dir + '(';
          postfix = ')';
        } else {
          attr = attrLegacy;
        }

        container.style[attr] = prefix + distance + 'px' + postfix;
      }
    }

    // for IE10
    function msInit() {
      if (navigator.msMaxTouchPoints) {
        wrapper.classList.add('ms-touch');
        addEvents(wrapper, ['scroll', ie10Scroll]);
      }
    }

    function slideItemsInit() {
      for (var x = 0; x < slideCount; x++) {
        var item = slideItems[x];

        // add slide id
        item.id = slideId + '-item' + x;

        // add class
        if (mode === 'gallery' && animateNormal) { item.classList.add(animateNormal); }

        // add aria-hidden attribute
        setAttrs(item, {'aria-hidden': 'true'});

        // set slide width & gutter
        var gutterPosition = (axis === 'horizontal') ? 'right' : 'bottom', 
            styles = '';
        if (mode === 'carousel') { styles = 'margin-' + gutterPosition + ': ' + gutter + 'px;'; }
        if (axis === 'horizontal') { styles = 'width: ' + (slideWidth - gutter) + 'px; ' + styles; }
        item.style.cssText += styles;
      }

      // clone slides
      if (loop || edgePadding) {
        var fragmentBefore = document.createDocumentFragment(), 
            fragmentAfter = document.createDocumentFragment();

        for (var j = cloneCount; j--;) {
          var num = j%slideCount,
              cloneFirst = slideItems[num].cloneNode(true);
          removeAttrs(cloneFirst, 'id');
          fragmentAfter.insertBefore(cloneFirst, fragmentAfter.firstChild);

          if (mode === 'carousel') {
            var cloneLast = slideItems[slideCount - 1 - num].cloneNode(true);
            removeAttrs(cloneLast, 'id');
            fragmentBefore.appendChild(cloneLast);
          }
        }

        container.insertBefore(fragmentBefore, container.firstChild);
        container.appendChild(fragmentAfter);
        slideItems = container.children;
      }
    }

    function controlsInit() {
      if (controls) {
        if (options.controlsContainer) {
          prevButton = controlsContainer.children[0];
          nextButton = controlsContainer.children[1];
          setAttrs(controlsContainer, {'aria-label': 'Carousel Navigation'});
          setAttrs(prevButton, {'data-controls' : 'prev'});
          setAttrs(nextButton, {'data-controls' : 'next'});
          setAttrs(controlsContainer.children, {
            'aria-controls': slideId,
            'tabindex': '-1',
          });
        } else {
          gn.append(wrapper, '<div data-tns-role="controls" aria-label="Carousel Navigation"><button data-controls="prev" tabindex="-1" aria-controls="' + slideId +'" type="button">' + controlsText[0] + '</button><button data-controls="next" tabindex="0" aria-controls="' + slideId +'" type="button">' + controlsText[1] + '</button></div>');

          controlsContainer = wrapper.querySelector('[data-tns-role="controls"]');
          prevButton = controlsContainer.children[0];
          nextButton = controlsContainer.children[1];
        }
      }
    }

    function navInit() {
      if (nav) {
        if (options.navContainer) {
          setAttrs(navContainer, {'aria-label': 'Carousel Pagination'});
          navItems = navContainer.children;
          for (var x = navItems.length; x--;) {
            setAttrs(navItems[x], {
              'data-nav': x,
              'tabindex': '-1',
              'aria-selected': 'false',
              'aria-controls': slideId + '-item' + x,
            });
          }
        } else {
          var navHtml = '';
          for (var i = 0; i < slideCount; i++) {
            navHtml += '<button data-nav="' + i +'" tabindex="-1" aria-selected="false" aria-controls="' + slideId + '-item' + i +'" type="button"></button>';
          }
          navHtml = '<div data-tns-role="nav" aria-label="Carousel Pagination">' + navHtml + '</div>';
          gn.append(wrapper, navHtml);

          navContainer = wrapper.querySelector('[data-tns-role="nav"]');
          navItems = navContainer.children;

          // hide navs
          for (var j = navCountVisible; j < slideCount; j++) {
            setAttrs(navItems[j], {'hidden': ''});
          }

          // update navCountVisibleCached
          navCountVisibleCached = navCountVisible;
        }

      }
    }

    function autoplayInit() {
      if (autoplay) {
        if (autoplayButton) {
          setAttrs(autoplayButton, {'data-action': 'stop'});
        } else {
          if (!navContainer) {
            gn.append(wrapper, '<div data-tns-role="nav" aria-label="Carousel Pagination"></div>');
            navContainer = wrapper.querySelector('[data-tns-role="nav"]');
          }

          gn.append(navContainer, '<button data-action="stop" type="button">' + autoplayHtmlString + autoplayText[0] + '</button>');
          autoplayButton = navContainer.querySelector('[data-action]');
        }

        // start autoplay
        startAction();
      }
    }

    function activateSlider() {
      for (var i = index; i < index + items; i++) {
        var item = slideItems[i];
        setAttrs(item, {'aria-hidden': 'false'});
        if (mode === 'gallery') { 
          item.style.left = slideWidth * (i - index) + 'px'; 
          item.classList.remove(animateNormal);
          item.classList.add(animateIn);
        }
      }
      if (controls) {
        setAttrs(nextButton, {'tabindex': '0'});
        if (index === indexMin && !loop || rewind) {
          prevButton.disabled = true;
        }
      }
      if (nav) {
        setAttrs(navItems[0], {'tabindex': '0', 'aria-selected': 'true'});
      }
    }

    function addSliderEvents() {
      if (mode === 'carousel') {
        if (TRANSITIONEND) {
          addEvents(container, [TRANSITIONEND, onTransitionEnd]);
        }
        if (touch) {
          addEvents(container, [
            ['touchstart', onTouchStart],
            ['touchmove', onTouchMove],
            ['touchend', onTouchEnd],
            ['touchcancel', onTouchEnd]
          ]);
        }
      }
      if (nav) {
        for (var y = 0; y < slideCount; y++) {
          addEvents(navItems[y],[
            ['click', onClickNav],
            ['keydown', onKeydownNav]
          ]);
        }
      }
      if (controls) {
        addEvents(prevButton,[
          ['click', onClickPrev],
          ['keydown', onKeydownControl]
        ]);
        addEvents(nextButton,[
          ['click', onClickNext],
          ['keydown', onKeydownControl]
        ]);
      }
      if (autoplay) {
        addEvents(autoplayButton, ['click', toggleAnimation]);
        if (autoplayHoverPause) {
          addEvents(container, ['mouseover', function () {
            if (animating) { 
              stopAction(); 
              autoplayHoverStopped = true;
            }
          }]);
          addEvents(container, ['mouseout', function () {
            if (!animating && autoplayHoverStopped) { 
              startAction(); 
              autoplayHoverStopped = false;
            }
          }]);
        }
      }
      if (arrowKeys) {
        addEvents(document, ['keydown', onKeydownDocument]);
      }
      addEvents(window, [
        ['resize', onResize],
        ['scroll', onScroll]
      ]);
    }

    // lazyload
    function lazyLoad() {
      if (lazyload && gn.isInViewport(container)) {
        var arr = [];
        for(var i = index - 1; i < index + items + 1; i++) {
          var imgsTem = slideItems[i].querySelectorAll('[data-tns-role="lazy-img"]');
          for(var j = imgsTem.length; j--; arr.unshift(imgsTem[j]));
          arr.unshift();
        }

        for (var h = arr.length; h--;) {
          var img = arr[h];
          if (!img.classList.contains('loaded')) {
            img.src = getAttr(img, 'data-src');
            img.classList.add('loaded');
          }
        }
      }
    }

    // check if all visible images are loaded
    // and update container height if it's done
    function runAutoHeight() {
      if (autoHeight) {
        // get all images inside visible slide items
        var images = [];

        for (var i = index; i < index + items; i++) {
          var imagesTem = slideItems[i].querySelectorAll('img');
          for (var j = imagesTem.length; j--;) {
            images.push(imagesTem[j]);
          }
        }

        if (images.length === 0) {
          updateContainerHeight(); 
        } else {
          checkImagesLoaded(images);
        }
      }
    }

    function checkImagesLoaded(images) {
      for (var i = images.length; i--;) {
        if (imageLoaded(images[i])) {
          images.splice(i, 1);
        }
      }

      if (images.length === 0) {
        updateContainerHeight();
      } else {
        setTimeout(function () { 
          checkImagesLoaded(images); 
        }, 16);
      }
    } 

    function sliderInit() {
      // First thing first, wrap container with "wrapper > contentWrapper",
      // to get the correct view width
      gn.wrap(container, contentWrapper);
      gn.wrap(contentWrapper, wrapper);

      getVariables(); // vw => items => indexMax, slideWidth, navCountVisible, slideBy
      slideItemsInit();
      if (axis === 'vertical') { getSlideTopEdges(); } // (init) => slideTopEdges

      wrapperInit();
      containerInit();
      msInit();
      controlsInit();
      navInit();
      autoplayInit();

      activateSlider();
      addSliderEvents();
      checkSlideCount(); // (items) => nav, controls, autoplay

      lazyLoad();
      runAutoHeight();
      events.emit('initialized', info());
    }
    sliderInit();

    // (vw) => edgePadding
    function getFixedWidthEdgePadding() {
      return (vw%slideWidth + gutter) / 2;
    }

    // update container height
    // 1. get the max-height of the visible slides
    // 2. set transitionDuration to speed
    // 3. update container height to max-height
    // 4. set transitionDuration to 0s after transition done
    function updateContainerHeight() {
      var heights = [], maxHeight;
      for (var i = index; i < index + items; i++) {
        heights.push(slideItems[i].offsetHeight);
      }
      maxHeight = Math.max.apply(null, heights);

      if (container.style.height !== maxHeight) {
        if (TRANSITIONDURATION) { setDurations(1); }
        container.style.height = maxHeight + 'px';
      }
    }

    // get the distance from the top edge of the first slide to each slide
    // (init) => slideTopEdges
    function getSlideTopEdges() {
      slideTopEdges = [0];
      var topFirst = slideItems[0].getBoundingClientRect().top, top;
      for (var i = 1; i < slideCountNew; i++) {
        top = slideItems[i].getBoundingClientRect().top;
        slideTopEdges.push(top - topFirst);
      }
    }

    // get wrapper height
    // (slideTopEdges, index, items) => vertical_conentWrapper.height
    function getVerticalWrapperHeight() {
      return slideTopEdges[index + items] - slideTopEdges[index];
    }

    // set snapInterval (for IE10)
    function setSnapInterval() {
      wrapper.style.msScrollSnapPointsX = 'snapInterval(0%, ' + slideWidth + ')';
    }

    // update slide
    function updateSlideStatus() {
      var h1, h2, v1, v2;
      if (index !== indexCached) {
        if (index > indexCached) {
          h1 = indexCached;
          h2 = Math.min(indexCached + items, index);
          v1 = Math.max(indexCached + items, index);
          v2 = index + items;
        } else {
          h1 = Math.max(index + items, indexCached);
          h2 = indexCached + items;
          v1 = index;
          v2 = Math.min(index + items, indexCached);
        }
      }

      if (slideBy%1 !== 0) {
        h1 = Math.round(h1);
        h2 = Math.round(h2);
        v1 = Math.round(v1);
        v2 = Math.round(v2);
      }

      for (var i = h1; i < h2; i++) {
        setAttrs(slideItems[i], {'aria-hidden': 'true'});
      }
      for (var j = v1; j < v2; j++) {
        setAttrs(slideItems[j], {'aria-hidden': 'false'});
      }
    }

    // set tabindex & aria-selected on Nav
    function updateNavStatus() {
      // get current nav
      if (nav) {
        if (navClicked === -1) {
          if (options.navContainer) {
            navCurrent = index%slideCount;
          } else {
            navCurrent = Math.floor(index%slideCount / items);
            // non-loop & reach the edge
            if (!loop && slideCount%items !== 0 && index === indexMax) { navCurrent += 1; }
          }
        } else {
          navCurrent = navClicked;
          navClicked = -1;
        }

        if (navCurrent !== navCurrentCached) {
          setAttrs(navItems[navCurrentCached], {
            'tabindex': '-1',
            'aria-selected': 'false'
          });

          setAttrs(navItems[navCurrent], {
            'tabindex': '0',
            'aria-selected': 'true'
          });
          navCurrentCached = navCurrent;
        }
      }
    }

    // set 'disabled' to true on controls when reach the edge
    function updateControlsStatus() {
      if (controls && !loop) {
        var disable = [], active = [];
        if (index === indexMin) {
          disable.push(prevButton);
          active.push(nextButton);
          changeFocus(prevButton, nextButton);
        } else if (!rewind && index === indexMax) {
          disable.push(nextButton);
          active.push(prevButton);
          changeFocus(nextButton, prevButton);
        } else {
          active.push(prevButton, nextButton);
        }

        if (disable.length > 0) {
          for (var i = disable.length; i--;) {
            var button = disable[i];
            if (!button.disabled) {
              button.disabled = true;
              setAttrs(button, {'tabindex': '-1'});
            }
          }
        }

        if (active.length > 0) {
          for (var j = active.length; j--;) {
            var button2 = active[j];
            if (button2.disabled) {
              button2.disabled = false;
              setAttrs(button2, {'tabindex': '0'});
            }
          }
        }
      }
    }

    // set duration
    function setDurations (duration, target) {
      duration = (duration === 0)? '' : speed / 1000 + 's';
      target = target || container;
      target.style[TRANSITIONDURATION] = duration;

      if (mode === 'gallery') {
        target.style[ANIMATIONDURATION] = duration;
      }
      if (axis === 'vertical') {
        contentWrapper.style[TRANSITIONDURATION] = duration;
      }
    }

    // make transfer after click/drag:
    // 1. change 'transform' property for mordern browsers
    // 2. change 'left' property for legacy browsers
    var transformCore = (function () {
      if (mode === 'carousel') {
        return function (distance) {
          // if distance is not given, calculate the distance use index
          if (!distance) {
            distance = (axis === 'horizontal') ? -slideWidth * index : -slideTopEdges[index];
          }
          // constrain the distance when non-loop no-edgePadding fixedWidth reaches the right edge
          if (hasRightDeadZone && index === indexMax) {
            distance = Math.max(distance, -slideCountNew * slideWidth + vw + gutter);
          }

          // modern browsers will use 'transform: translateX(Y)'
          // legacy browsers will use 'left | top' 
          var attr = TRANSFORM,
              attrLegacy = 'left',
              tran = 'translate',
              prefix = '',
              postfix = '', 
              dir = 'X';

          if (axis === 'vertical') {
            dir = 'Y';
            attrLegacy = 'top';
          }

          if (TRANSFORM) {
            prefix = tran + dir + '(';
            postfix = ')';
          } else {
            attr = attrLegacy;
          }

          container.style[attr] = prefix + distance + 'px' + postfix;

          if (axis === 'vertical') { contentWrapper.style.height = getVerticalWrapperHeight() + 'px'; }
        };
      } else {
        return function () {
          slideItemsOut = [];
          removeEvents(slideItems[indexCached], [
            [TRANSITIONEND, onTransitionEnd],
            [ANIMATIONEND, onTransitionEnd]
          ]);
          addEvents(slideItems[index], [
            [TRANSITIONEND, onTransitionEnd],
            [ANIMATIONEND, onTransitionEnd]
          ]);

          (function () {
            for (var i = indexCached, l = indexCached + items; i < l; i++) {
              var item = slideItems[i];
              if (TRANSITIONDURATION) { setDurations(1, item); }
              if (animateDelay && TRANSITIONDELAY) {
                var d = animateDelay * (i - indexCached) / 1000; 
                item.style[TRANSITIONDELAY] = d + 's'; 
                item.style[ANIMATIONDELAY] = d + 's'; 
              }
              item.classList.remove(animateIn);
              item.classList.add(animateOut);
              slideItemsOut.push(item);
            }
          })();

          (function () {
            for (var i = index, l = index + items; i < l; i++) {
              var item = slideItems[i];
              if (TRANSITIONDURATION) { setDurations(1, item); }
              if (animateDelay && TRANSITIONDELAY) {
                var d = animateDelay * (i - index) / 1000; 
                item.style[TRANSITIONDELAY] = d + 's'; 
                item.style[ANIMATIONDELAY] = d + 's'; 
              }
              item.classList.remove(animateNormal);
              item.classList.add(animateIn);
              if (i > index) { item.style.left = (i - index) * slideWidth + 'px'; }
            }
          })();
        };
      }
    })();

    function doTransform (duration, distance) {
      if (TRANSITIONDURATION) { setDurations(duration); }
      transformCore(distance);
    }

    // (slideBy, indexMin, indexMax) => index
    var checkIndex = (function () {
      if (loop) {
        return function () {
          var leftEdge = (mode === 'carousel')? slideBy + indexMin : indexMin, 
              rightEdge = (mode === 'carousel')? indexMax - slideBy : indexMax;

          if (fixedWidth && vw%slideWidth !== 0) { rightEdge -= 1; }

          if (index > rightEdge) {
            while(index >= leftEdge + slideCount) { index -= slideCount; }
          } else if(index < leftEdge) {
            while(index <= rightEdge - slideCount) { index += slideCount; }
          }
        };
      } else {
        return function () {
          index = Math.max(indexMin, Math.min(indexMax, index));
        };
      }
    })();

    function render() {
      if (TRANSITIONEND) { setAttrs(container, {'aria-busy': 'true'}); }
      if (checkIndexBeforeTransform) { checkIndex(); }

      if (index !== indexCached) { events.emit('indexChanged', info()); }
      if (TRANSFORM) { events.emit('transitionStart', info()); }

      doTransform();
      if (!TRANSITIONEND) { onTransitionEnd(); }
    }

    // AFTER TRANSFORM
    // Things need to be done after a transfer:
    // 1. check index
    // 2. add classes to visible slide
    // 3. disable controls buttons when reach the first/last slide in non-loop slider
    // 4. update nav status
    // 5. lazyload images
    // 6. update container height
    function onTransitionEnd(e) {
      if (TRANSITIONEND) { events.emit('transitionEnd', info(e)); }

      if (mode === 'gallery' && slideItemsOut.length > 0) {
        for (var i = 0; i < items; i++) {
          var item = slideItemsOut[i];
          if (TRANSITIONDURATION) { setDurations(0, item); }
          if (animateDelay && TRANSITIONDELAY) { 
            item.style[TRANSITIONDELAY] = item.style[ANIMATIONDELAY] = '';
          }
          item.classList.remove(animateOut);
          item.classList.add(animateNormal);
          item.style.left = '';
        }
      }

      if (!TRANSITIONEND || e && e.propertyName !== 'height') {
        if (!checkIndexBeforeTransform) { 
          var indexTem = index;
          checkIndex(); // (slideBy, indexMin, indexMax) => index
          if (index !== indexTem) { 
            doTransform(0); 
            events.emit('indexChanged', info());
          }
        } 
        updateSlideStatus();
        updateNavStatus();
        updateControlsStatus();
        lazyLoad();
        runAutoHeight();

        if (TRANSITIONEND) { removeAttrs(container, 'aria-busy'); }
        updateIndexCache();
      }
    }

    function updateIndexCache() {
      indexCached = index;
    }

    // # ACTIONS
    // on controls click
    function onClickControl(dir) {
      if (getAttr(container, 'aria-busy') !== 'true') {
        index = index + dir * slideBy;

        render();
      }
    }

    function onClickPrev() {
      onClickControl(-1);
    }

    function onClickNext() {
      if(rewind && index === indexMax){
        onClickControl(-(indexMax - indexMin) / slideBy);
      }else{
        onClickControl(1);
      }
    }

    // on doc click
    function onClickNav(e) {
      if (getAttr(container, 'aria-busy') !== 'true') {
        var clickTarget = e.target || e.srcElement, navIndex, indexGap;

        while (gn.indexOf(navItems, clickTarget) === -1) {
          clickTarget = clickTarget.parentNode;
        }

        navIndex = navClicked = Number(getAttr(clickTarget, 'data-nav'));
        var adjust = (mode === 'gallery')? 0 : cloneCount;
        index = (options.navContainer) ? navIndex + adjust : navIndex * items + adjust;

        if (index !== indexCached) { render(); }
      }
    }

    function startAction() {
      autoplayTimer = setInterval(function () {
        onClickControl(autoplayDirection);
      }, autoplayTimeout);
      setAttrs(autoplayButton, {'data-action': 'stop'});
      autoplayButton.innerHTML = autoplayHtmlString + autoplayText[1];

      animating = true;
    }

    function stopAction() {
      clearInterval(autoplayTimer);
      setAttrs(autoplayButton, {'data-action': 'start'});
      autoplayButton.innerHTML = autoplayHtmlString.replace('Stop', 'Start') + autoplayText[0];

      animating = false;
    }

    function toggleAnimation() {
      if (animating) {
        stopAction();
      } else {
        startAction();
      }
    }

    // 
    function onKeydownDocument(e) {
      e = e || window.event;
      switch(e.keyCode) {
        case KEY.LEFT:
          onClickPrev();
          break;
        case KEY.RIGHT:
          onClickNext();
      }
    }

    // change focus
    function changeFocus(blur, focus) {
      if (typeof blur === 'object' && 
          typeof focus === 'object' && 
          blur === document.activeElement) {
        blur.blur();
        focus.focus();
      }
    }

    // on key control
    function onKeydownControl(e) {
      e = e || window.event;
      var code = e.keyCode,
          curElement = document.activeElement;

      switch (code) {
        case KEY.LEFT:
        case KEY.UP:
        case KEY.HOME:
        case KEY.PAGEUP:
          if (curElement !== prevButton && prevButton.disabled !== true) {
            changeFocus(curElement, prevButton);
          }
          break;
        case KEY.RIGHT:
        case KEY.DOWN:
        case KEY.END:
        case KEY.PAGEDOWN:
          if (curElement !== nextButton && nextButton.disabled !== true) {
            changeFocus(curElement, nextButton);
          }
          break;
        case KEY.ENTER:
        case KEY.SPACE:
          if (curElement === nextButton) {
            onClickNext();
          } else {
            onClickPrev();
          }
          break;
      }
    }

    // on key nav
    function onKeydownNav(e) {
      e = e || window.event;
      var code = e.keyCode,
          curElement = document.activeElement,
          dataSlide = getAttr(curElement, 'data-nav');

      switch(code) {
        case KEY.LEFT:
        case KEY.PAGEUP:
          if (dataSlide > 0) { changeFocus(curElement, curElement.previousElementSibling); }
          break;
        case KEY.UP:
        case KEY.HOME:
          if (dataSlide !== 0) { changeFocus(curElement, navItems[0]); }
          break;
        case KEY.RIGHT:
        case KEY.PAGEDOWN:
          if (dataSlide < navCountVisible - 1) { changeFocus(curElement, curElement.nextElementSibling); }
          break;
        case KEY.DOWN:
        case KEY.END:
          if (dataSlide < navCountVisible - 1) { changeFocus(curElement, navItems[navCountVisible - 1]); }
          break;
        case KEY.ENTER:
        case KEY.SPACE:
          onClickNav(e);
          break;
      }
    }

    // IE10 scroll function
    function ie10Scroll() {
      doTransform(0, container.scrollLeft());
      updateIndexCache();
    }

    function onTouchStart(e) {
      var touchObj = e.changedTouches[0];
      startX = parseInt(touchObj.clientX);
      startY = parseInt(touchObj.clientY);
      translateInit = Number(container.style[TRANSFORM].slice(11, -3));
      events.emit('touchStart', info(e));
    }

    function onTouchMove(e) {
      var touchObj = e.changedTouches[0];
      disX = parseInt(touchObj.clientX) - startX;
      disY = parseInt(touchObj.clientY) - startY;

      if (getTouchDirection(toDegree(disY, disX), 15) === axis) { 
        touchStarted = true;
        e.preventDefault();
        events.emit('touchMove', info(e));

        var x = (axis === 'horizontal')? 'X(' + (translateInit + disX) : 'Y(' + (translateInit + disY);

        setDurations(0);
        container.style[TRANSFORM] = 'translate' + x + 'px)';
      }
    }

    function onTouchEnd(e) {
      var touchObj = e.changedTouches[0];
      disX = parseInt(touchObj.clientX) - startX;
      disY = parseInt(touchObj.clientY) - startY;
      events.emit('touchEnd', info(e));

      if (touchStarted) {
        touchStarted = false;
        e.preventDefault();

        if (axis === 'horizontal') {
          index = - (translateInit + disX) / slideWidth;
          index = (disX > 0) ? Math.floor(index) : Math.ceil(index);
        } else {
          var moved = - (translateInit + disY);
          if (moved <= 0) {
            index = indexMin;
          } else if (moved >= slideTopEdges[slideTopEdges.length - 1]) {
            index = indexMax;
          } else {
            var i = 0;
            do {
              i++;
              index = (disY < 0) ? i + 1 : i;
            } while (i < slideCountNew && moved >= Math.round(slideTopEdges[i + 1]));
          }
        }

        render();
      }
    }

    // === RESIZE FUNCTIONS === //
    // (slideWidth) => container.width, slide.width
    function updateSlideWidth() {
      container.style.width = (slideWidth + 1) * slideCountNew + 'px'; // + 1 => fix half-pixel issue
      for (var i = slideCountNew; i--;) {
        slideItems[i].style.width = (slideWidth - gutter) + 'px';
      }
    }

    // (slideWidth, index, items) => gallery_visible_slide.left
    function updateSlidePosition() {
      for (var i = index + 1, len = index + items; i < len; i++) {
        slideItems[i].style.left = slideWidth * (i - index) + 'px';
      }
    }

    // (vw) => fixedWidth_contentWrapper.edgePadding
    function updateFixedWidthEdgePadding() {
      contentWrapper.style.cssText = 'margin: 0px ' + getFixedWidthEdgePadding() + 'px';
    }

    // (slideTopEdges, index, items) => vertical_conentWrapper.height
    function updateWrapperHeight() {
      contentWrapper.style.height = getVerticalWrapperHeight() + 'px';
    }

    // show or hide nav
    // (navCountVisible) => nav.[hidden]
    function updateNavDisplay() {
      if (navCountVisible !== navCountVisibleCached) {
        if (navCountVisible > navCountVisibleCached) {
          for (var i = navCountVisibleCached; i < navCountVisible; i++) {
            removeAttrs(navItems[i], 'hidden');
          }
        } else {
          for (var j = navCountVisible; j < navCountVisibleCached; j++) {
            setAttrs(navItems[j], {'hidden': ''});
          }
        }
      }
      navCountVisibleCached = navCountVisible;
    }

    function info(e) {
      return {
        container: container,
        slideItems: slideItems,
        navItems: navItems,
        prevButton: prevButton,
        nextButton: nextButton,
        items: items,
        index: index,
        indexCached: indexCached,
        navCurrent: navCurrent,
        navCurrentCached: navCurrentCached,
        slideCount: slideCount,
        cloneCount: cloneCount,
        slideCountNew: slideCountNew,
        event: e || {},
      };
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (vw !== getViewWidth()) {
          var indexTem = index,
              itemsTem = items;
          getVariables(); // vw => items => indexMax, slideWidth, navCountVisible, slideBy
          checkSlideCount(); // (items) => nav, controls, autoplay
          checkIndex(); // (slideBy, indexMin, indexMax) => index

          if (axis === 'horizontal') {
            if (fixedWidth && edgePadding) {
              updateFixedWidthEdgePadding(); // (vw) => fixedWidth_contentWrapper.edgePadding
            } else {
              updateSlideWidth(); // (slideWidth) => container.width, slide.width
              if (mode === 'gallery') {
                updateSlidePosition(); // (slideWidth, index, items) => gallery_visible_slide.left
              }
            }
          } else {
            getSlideTopEdges(); // (init) => slideTopEdges
            updateWrapperHeight(); // (slideTopEdges, index, items) => vertical_conentWrapper.height
          }

          if (index !== indexTem) { 
            events.emit('indexChanged', info());
            updateSlideStatus();
            if (!loop) { updateControlsStatus(); }
          }

          // (navCountVisible) => nav.[hidden]
          if (items !== itemsTem && !options.navContainer) { 
            updateNavDisplay(); 
            updateNavStatus();
          } 

          if (index !== indexTem || mode === 'carousel' && !fixedWidth) { doTransform(0); }
          if (autoHeight) { runAutoHeight(); }
          if (lazyload && index !== indexTem || items !== itemsTem) { lazyLoad(); }

          if (navigator.msMaxTouchPoints) { setSnapInterval(); }
        }
      }, 100); // update after stop resizing for 100 ms
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          lazyLoad();
          ticking = false;
        });
      }
      ticking = true;
    }

    return {
      getInfo: info,
      events: events,
      destory: function () {
        // wrapper
        gn.unwrap(wrapper);
        gn.unwrap(contentWrapper);
        wrapper = contentWrapper = null;

        // container
        removeAttrs(container, ['id', 'style', 'data-tns-role', 'data-tns-features']);

        // cloned items
        if (loop) {
          for (var j = cloneCount; j--;) {
            slideItems[0].remove();
            slideItems[slideItems.length - 1].remove();
          }
        }

        // Slide Items
        removeAttrs(slideItems, ['id', 'style', 'aria-hidden']);
        slideId = slideCount = null;

        // controls
        if (controls) {
          if (!options.controlsContainer) {
            controlsContainer.remove();
            controlsContainer = prevButton = nextButton = null;
          } else {
            removeAttrs(controlsContainer, ['aria-label']);
            removeAttrs(controlsContainer.children, ['aria-controls', 'tabindex']);
            removeEventsByClone(controlsContainer);
          }
        }

        // nav
        if (nav) {
          if (!options.navContainer) {
            navContainer.remove();
            navContainer = null;
          } else {
            removeAttrs(navContainer, ['aria-label']);
            removeAttrs(navItems, ['aria-selected', 'aria-controls', 'tabindex']);
            removeEventsByClone(navContainer);
          }
          navItems = null;
        }

        // auto
        if (autoplay) {
          if (!options.navContainer && navContainer !== null) {
            navContainer.remove();
            navContainer = null;
          } else {
            removeEventsByClone(autoplayButton);
          }
        }

        // remove slider container events at the end
        // because this will make container = null
        removeEventsByClone(container);

        // remove arrowKeys eventlistener
        if (arrowKeys) {
          removeEvents(document, ['keydown', onKeydownDocument]);
        }

        // remove window event listeners
        removeEvents(window, [
          ['resize', onResize],
          ['scroll', onScroll]
        ]);
      },

      // $ Private methods, for test only
      // hasAttr: hasAttr, 
      // getAttr: getAttr, 
      // setAttrs: setAttrs, 
      // removeAttrs: removeAttrs, 
      // removeEventsByClone: removeEventsByClone, 
      // getSlideId: getSlideId, 
      // toDegree: toDegree, 
      // getTouchDirection: getTouchDirection, 
      // hideElement: hideElement, 
      // showElement: showElement,
    };
  }

  // === Private helper functions === //
  function getSlideId() {
    if (window.tnsId === undefined) {
      window.tnsId = 1;
    } else {
      window.tnsId++;
    }
    return 'tns' + window.tnsId;
  }

  function toDegree (y, x) {
    return Math.atan2(y, x) * (180 / Math.PI);
  }

  function getTouchDirection(angle, range) {
    if ( Math.abs(90 - Math.abs(angle)) >= (90 - range) ) {
      return 'horizontal';
    } else if ( Math.abs(90 - Math.abs(angle)) <= range ) {
      return 'vertical';
    } else {
      return false;
    }
  }

  function hasAttr(el, attr) {
    return el.hasAttribute(attr);
  }

  function getAttr(el, attr) {
    return el.getAttribute(attr);
  }

  function setAttrs(els, attrs) {
    els = (gn.isNodeList(els) || els instanceof Array) ? els : [els];
    if (Object.prototype.toString.call(attrs) !== '[object Object]') { return; }

    for (var i = els.length; i--;) {
      for(var key in attrs) {
        els[i].setAttribute(key, attrs[key]);
      }
    }
  }

  function removeAttrs(els, attrs) {
    els = (gn.isNodeList(els) || els instanceof Array) ? els : [els];
    attrs = (attrs instanceof Array) ? attrs : [attrs];

    var attrLength = attrs.length;
    for (var i = els.length; i--;) {
      for (var j = attrLength; j--;) {
        els[i].removeAttribute(attrs[j]);
      }
    }
  }

  function removeEventsByClone(el) {
    var elClone = el.cloneNode(true), parent = el.parentNode;
    parent.insertBefore(elClone, el);
    el.remove();
    el = null;
  }

  function hideElement(el) {
    if (!hasAttr(el, 'hidden')) {
      setAttrs(el, {'hidden': ''});
    }
  }

  function showElement(el) {
    if (hasAttr(el, 'hidden')) {
      removeAttrs(el, 'hidden');
    }
  }

  // check if an image is loaded
  // 1. See if "naturalWidth" and "naturalHeight" properties are available.
  // 2. See if "complete" property is available.
  function imageLoaded(img) {
    if (typeof img.complete === 'boolean') {
      return img.complete;
    } else if (typeof img.naturalWidth === 'number') {
      return img.naturalWidth !== 0;
    }
  }

  // From Modernizr
  function whichProperty(obj){
    var t, el = document.createElement('fakeelement');
    for(t in obj){
      if( el.style[t] !== undefined ){
        return [t, obj[t][0], obj[t][1]];
      }
    }

    return false; // explicit for ie9-
  }

  function addEvents(el, events) {
    function add(arr) {
      el.addEventListener(arr[0], arr[1], false);
    }

    if (Array.isArray(events)) {
      if (Array.isArray(events[0])) {
        for (var i = events.length; i--;) {
          add(events[i]);
        }
      } else {
        add(events);
      }
    }
  }

  function removeEvents(el, events) {
    function remove(arr) {
      el.removeEventListener(arr[0], arr[1], false);
    }

    if (Array.isArray(events)) {
      if (Array.isArray(events[0])) {
        for (var i = events.length; i--;) {
          remove(events[i]);
        }
      } else {
        remove(events);
      }
    }
  }

  var events = {
    events: {},
    on: function (eventName, fn) {
      this.events[eventName] = this.events[eventName] || [];
      this.events[eventName].push(fn);
    },
    off: function(eventName, fn) {
      if (this.events[eventName]) {
        for (var i = 0; i < this.events[eventName].length; i++) {
          if (this.events[eventName][i] === fn) {
            this.events[eventName].splice(i, 1);
            break;
          }
        }
      }
    },
    emit: function (eventName, data) {
      if (this.events[eventName]) {
        this.events[eventName].forEach(function(fn) {
          fn(data);
        });
      }
    }
  };

  return core;
})();