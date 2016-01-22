define (function() {
   //PRIVATE MEMBERS******************************************************************************************
   //*********************************************************************************************************

   // ATTRIBUTES
   //*************************************
    //Available events are :
    // MOVE
    var _events = {};
        
   // METHODS
   //*************************************
   
   //END OF PRIVATE MEMBERS***********************************************************************************
   //*********************************************************************************************************
   
   /**
    * Dispatches events to registred modules. This allows independency between modules. For example, when Navigation.move
    * is called, we do not have to call specific methods of other modules inside the function, but just call
    * Dispatcher.send("MOVE"), then all registered modules will process the event.
    * 
    * @author M. BENARD
    * @exports Dispatcher
    */
    var Dispatcher = {
        register : function (event, module) {
            if (_events.hasOwnProperty(event)){
                _events[event].push(module);
            }
            else {
                _events[event] = [module];
            }
        },
        
        send : function (event){
            var registredModules = _events[event];
            if (registredModules) {
                for (var i=0, l=registredModules.length;i<l;i++){
                    registredModules[i].processEvent(event);
                }
            }
        }
        
    };
    
    return Dispatcher;
});


