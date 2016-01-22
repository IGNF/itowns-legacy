({
    paths : {
        'geoportail' : "http://api.ign.fr/geoportail/api/js/2.0.3/Geoportal",//"http://localhost/itownsRELEASE_NantesTest8/Geoportal",//"http://api.ign.fr/geoportail/api/js/2.0.3/Geoportal",
        'jquery' : "//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min",
        'jqueryui' : "http://code.jquery.com/ui/1.10.3/jquery-ui.min",
        'prefixfree' : 'lib/prefixfree.min'
    },

    shim : {
        'jqueryui' : {
            deps : ['jquery']
        },
        'towns' : {
            deps : ['jquery', 'jqueryui']
        }
    },

    baseUrl : "../../src",
    name: "app",
    out: "../../build/itowns.js",
    removeCombined: false
})