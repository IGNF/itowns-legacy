requirejs.config({
    baseUrl: 'src/',
    paths : {
        'geoportail' : "https://api.ign.fr/geoportail/api/js/2.0.3/Geoportal",
        'jquery' : "https://ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min"
    },

    waitSeconds : 0
});

var allInitialized = false;   // GLOBAL PARAMETER TO USE IN API SCRIPT TO BE SURE ASYNCHRONE LOAD OF METADATA (FROM DB ETC) IS DONE

requirejs([ 'API','GraphicEngine', 'RequestManager','Events', 'DemoUI'],
    function(API,  GraphicEngine, RequestManager , Events )
    {

        GraphicEngine.init('containerITOWNS');
        GraphicEngine.render();
        Events.init();
        allInitialized = true;
    });
