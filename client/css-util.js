/* global $ */

var whichTransitionEvent = (function (){
  var t;
  var el = document.createElement('fakeelement');
  var transitions = {
    'transition':'transitionend',
    'OTransition':'oTransitionEnd',
    'MozTransition':'transitionend',
    'WebkitTransition':'webkitTransitionEnd'
  };

  for(t in transitions){
    if( el.style[t] !== undefined ){
      el.remove(); // don't leak memory
      console.log('using the', transitions[t], 'event');
      return transitions[t];
    }
  }
}());

/* global CSSUtil:true */
CSSUtil = {
  onTransitionEnd: function(selector, callback) {
    if (whichTransitionEvent) {
      $(selector).on(whichTransitionEvent, callback);
    } else {
      console.warn('Your browser does not seem to support transition end events!');
      setTimeout(callback, 500);
    }
  }
};
