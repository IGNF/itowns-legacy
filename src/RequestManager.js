define(['jquery', 'Config'],function($, Config) {
    
    //PRIVATE MEMBERS******************************************************************************************
    //*********************************************************************************************************
    
    // ATTRIBUTES
    //*************************************
   
    //var GEOPORTAL_CLASSES = ['OpenLayers','Geoportal'],
    var DEBUG = true;
  
    //Web processing service
    var _capabilitiesWPS     = null;
    var _serviceWPS          = [];
    var _processWPS          = null;
    
    // METHODS
    //*************************************
    function printRequestError(jqxhr, textStatus, error){
        
        msg = textStatus + ', ' + error;
        console.error(msg);
    }
    
    //END OF PRIVATE MEMBERS***********************************************************************************
    //*********************************************************************************************************
    
    /**
     * Manages request sent to the web server
     * @author Alexandre Devaux IGN
     * @export RequestManager
     */
    var RequestManager = {
    
         init : function (){
            $.ajaxSetup({
               timeout : Config.requestTimeout 
            });
        },
    
        /**
         * Returns the information of the panoramic contained in the given array.
         * @param {String[]} queryResult The resulting string returned by the PHP script splitted in an array.
         * Elements of this array are formatted like this "information_name=information_value". The 2 last
         * elements of this array must contains, first, the number of fields in the SQL request, second, the 
         * number of rows returned by the SQL request.
         * @param {Number} [numPano] The number of wanted panoramic information
         * 
         * @return {Object[]} An array containing literal object which are information on the panoramic.  
        */
        getPanoInfo : function (queryResult, numPano) {

            numPano = numPano || parseInt(queryResult[queryResult.length-1].split("=")[1]);
            var numFields = parseInt(queryResult[queryResult.length-2].split("=")[1]);

            var fieldNames = [];
            for (var i=0;i<numFields;i++) {
                fieldNames.push(queryResult[i].split("=")[0]);
            }

            var info = [];

            for (i=0; i<numPano; i++) {
                var panInfo = {};
                var offset = i*numFields;
                for (var j=0;j < numFields;j++) {
                    var fieldName = fieldNames[j];
                    var val = queryResult[offset+j].split("=")[1];
                    if (fieldName !== "filename" && fieldName.match(/time/) === null && fieldName.match(/addr/) === null){
                         val = parseFloat(val);
                    }
                    panInfo[fieldName] = val;
                }
                
                panInfo.url = Config.server.url+Config.server.iipService+"/"+panInfo.filename+".jp2";
                info.push(panInfo);
            }
            return info;
        },

        sendCommand : function(url,resultHandler, json){
            
            json = json || false;
            
            if (json === true){
                $.getJSON(url, function (data){
                    resultHandler(data);
                })
                .fail(printRequestError);
            }
            else { //keep for compatibility
                var jqxhr = $.get(url, function (data){
                    if (data.length > 0) {
                        var arrayResult = data.trim().split("&");   
                        resultHandler(arrayResult);
                    }
                    else if (DEBUG === true){
                        console.warn("Result of query is empty");
                    }
                });
                jqxhr.fail(printRequestError);
            }
        }
    };
        
    return RequestManager;

});
