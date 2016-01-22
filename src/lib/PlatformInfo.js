define ([],function(){
              var PlatformInfo = (function() {
                var info = {
                        browser:		'other', 
                        version:		'0.0.0', 
                        isTouchDevice:	(document.createTouch !== undefined)	// detect if it is running on a touch device
                };

                var agents = [
                        ['firefox', /Firefox[\/\s](\d+(?:.\d+)*)/], 
                        ['chrome',  /Chrome[\/\s](\d+(?:.\d+)*)/ ], 
                        ['opera',   /Opera[\/\s](\d+(?:.\d+)*)/], 
                        ['safari',  /Safari[\/\s](\d+(?:.\d+)*)/], 
                        ['webkit',  /AppleWebKit[\/\s](\d+(?:.\d+)*)/], 
                        ['ie',      /MSIE[\/\s](\d+(?:.\d+)*)/]
                ];

                var matches;
                for(var i=0; i<agents.length; i++) {
                        if((matches = agents[i][1].exec(window.navigator.userAgent))) {
                                info.browser = agents[i][0];
                                info.version = matches[1];
                                break;
                        }
                }

                return info;
        }) ();
 
 return PlatformInfo;
 
 });