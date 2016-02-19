window.allInitialized = false;   // GLOBAL PARAMETER TO USE IN API SCRIPT TO BE SURE ASYNCHRONE LOAD OF METADATA (FROM DB ETC) IS DONE

define([ 'API','GraphicEngine', 'Events'],
    function(API,  GraphicEngine, Events )
    {
        GraphicEngine.init('containerITOWNS');
        GraphicEngine.render();
        Events.init();
        window.allInitialized = true;
    });
