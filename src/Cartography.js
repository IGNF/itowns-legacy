define(['three', 'jquery', 'Utils', 'Panoramic', 'Navigation','Config'],
        function(THREE, $, Utils, Panoramic, Navigation,  Config) {

            //***************************** PRIVATE MEMBERS OF MODULE ************************************************/

            // ATTRIBUTES

            var GEOPORTAL_CLASSES = ['OpenLayers', 'Geoportal'],
                    DEBUG = true,
                    __mapDivId = '', //name of div element containing the Geoportal Map
                    _apiKey = '', //key of the API contract
                    _geoportalTimer = null, //timer used by checkAPILoading
                    _currentPos = {}, //current position of the "pegsman"
                    _viewer = null, //the geoportal viewer
                    _currentPosLayer = null, //layer where current position is displayed
                    _panoramicLayer = null,
                    _itineraryLayer = null, // Layer of current ininerary
                    _laserLayer     = null,
                    _geoveloLayer = null,
                    _isDragging = false,
                    _initializing = false,
                    _initialized = false,
                    _selectedFeature = null,
                    _selectControl = null,
                    _heading = 0,
                    _topLeftCorner = {x: -20037508, y: 20037508},
                    _sizeTile = (1066.3647919248918304 * 0.28 / 1000) * 256,
                    _sizeTileLamb93 = 0,
                    _arrayTiles = [], // Array to stock tiles to load for 3D ortho
                    _arrayPosTiles = [];   // Array to stock tiles position in lamb93


            //Load the 2D Geoportal MAP and initialize it
            function initMap()


            {
                var options = {
                    mode: 'normal',
                    territory: 'FXX'
                };

                _viewer = new Geoportal.Viewer.Default(_mapDivId, options, OpenLayers.Util.extend(
                        options, window.gGEOPORTALRIGHTSMANAGEMENT === undefined ? {
                            'apiKey': 'cleok'
                        } : gGEOPORTALRIGHTSMANAGEMENT));

                if (!_viewer)
                {
                    throw new Error("Failed to intilise the Geoportal viewer");
                }

                //Remove logo and copyright
                var dirts = [_viewer.getMap().getControlsByClass('Geoportal.Control.PermanentLogo')[0],
                    _viewer.getMap().getControlsByClass('Geoportal.Control.Logo')[0],
                    _viewer.getMap().getControlsByClass('Geoportal.Control.TermsOfService')[0]];

                for (var k = 0, dirtLen = dirts.length; k < dirtLen; k++) {
                    _viewer.getMap().removeControl(dirts[k]);
                }

                //Hide copyright
                //document.getElementById("cp_Geoportal.Control.Information_55").style.display = "none";

                //---- LAYERS

                //---- PREDEFINED GEOPORTAL LAYERS
                try {

                    _viewer.addGeoportalLayer('GEOGRAPHICALGRIDSYSTEMS.MAPS', {});
                    _viewer.addGeoportalLayer('ORTHOIMAGERY.ORTHOPHOTOS', {});
                    //_viewer.addGeoportalLayer('ORTHOIMAGERY.ORTHOPHOTOS.PARIS', {});
                }
                catch (e) {
                    console.error("Something went wrong while loading one of the Geoportal layer")
                }

                // ---- OPEN DATA TREES (Paris 12)
                // @TODO : load this kind of data from db or conf files

                //         var treeLayerStyle = new OpenLayers.StyleMap(new OpenLayers.Style(
                //            {
                //             'externalGraphic': 'img/arbre.png',
                //             'graphicWidth': "${dimension}",
                //             'graphicHeight': "${dimension}"
                //            },
                //            {
                //                context: {
                //                    dimension: function (feature)
                //                    {
                //                        if (typeof(feature.attributes.count) === 'undefined') { // not a cluster, atomic feature
                //                            return 15;
                //                        }
                //                        else
                //                        {
                //                            var featuresInCluster = feature.attributes.count;
                //                            if ( featuresInCluster >= 1000){
                //                                return 40;
                //                            }
                //                            else if (featuresInCluster >= 100) {
                //                                return 30;
                //                            }
                //                            else {
                //                                return 20;
                //                            }
                //                        }
                //                    }
                //                }
                //            })
                //        );
                //
                //
                //        try {
                //            _viewer.getMap().addLayer(
                //                "WFS",
                //                'Trees',
                //                "http://localhost/cgi-bin/mapserv.exe?map=..%5Cwfs.map&", //@todo change hard coded address
                //                {typename:'trees_wfs'},
                //                {
                //                    featurePrefix:'ms',
                //                    featureNS:'http://mapserver.gis.umn.edu/mapserver',
                //                    geometryName:'msGeometry',
                //                    projection:'EPSG:2154',
                //                    maxExtent:new OpenLayers.Bounds(653227.687500,6858349.000000, 657171.625000, 6861778.000000),
                //                    styleMap:treeLayerStyle,
                //                    visibility:false,
                //                    strategies:[new OpenLayers.Strategy.Fixed(), new OpenLayers.Strategy.Cluster({
                //                        distance: 40,
                //                        threshold: 10
                //                    })]
                //                });
                //        }
                //        catch (e) {
                //            console.error("Unable to access open data on mapserver");
                //            console.error(e.message);
                //        }

                //--- CURRENT POSITION
                _currentPosLayer = new OpenLayers.Layer.Vector("Current Position");
                _viewer.getMap().addLayer(_currentPosLayer);

                var currentPosGeom = new OpenLayers.Geometry.Point(_currentPos.easting, _currentPos.northing);

                // converting from lambert93 to viewer srs
                currentPosGeom = currentPosGeom.transform(new OpenLayers.Projection("EPSG:2154"), _viewer.getMap().getProjectionObject());
                var truckFeature = new OpenLayers.Feature.Vector(currentPosGeom, {},
                        {
                            externalGraphic: "images/position.png",
                            graphicWidth: 35,
                            graphicHeight: 71
                        });

                /*var frustumFeature = new OpenLayers.Feature.Vector(currentPosGeom.clone(), {},
                 {
                 externalGraphic: "images/frustum.png",
                 graphicWidth: 46,
                 graphicHeight: 129
                 });*/

                _currentPosLayer.addFeatures([/*frustumFeature,*/truckFeature]);

                // click on map move the current position and the position in the 3D world if possible
                // add the control enabling it there
                OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
                    defaultHandlerOptions: {
                        'single': true,
                        'double': true,
                        'pixelTolerance': 0,
                        'stopSingle': false,
                        'stopDouble': false
                    },
                    handleRightClicks: true,
                    initialize: function(options) {


                        // Get control of the right-click event:
                        document.getElementById('geoportailDiv').oncontextmenu = function(e) {
                            e = e ? e : window.event;
                            if (e.preventDefault)
                                e.preventDefault(); // For non-IE browsers.
                            else
                                return false; // For IE browsers.
                        };


                        this.handlerOptions = OpenLayers.Util.extend({}, this.defaultHandlerOptions);
                        OpenLayers.Control.prototype.initialize.apply(this, arguments);
                        this.handler = new OpenLayers.Handler.Click(
                                this,
                                {
                                    'click': this.trigger,

                                }, this.handlerOptions
                                );
                    },
                    //@todo
                    trigger: function(e) {

                        var lonlat = _viewer.getMap().getLonLatFromPixel(e.xy);
                        lonlat.transform(_viewer.getMap().getProjectionObject(), new OpenLayers.Projection("EPSG:2154"));
                        Navigation.goToClosestPosition({x: lonlat.lon, y: 0, z: lonlat.lat}, {distance: 100});

                    },
                    

                });

                var click = new OpenLayers.Control.Click();
                _viewer.getMap().addControl(click);
                click.activate();

                //--- PANORAMICS (dev helper @todo see how to exclude it when building)
                if (DEBUG === true) {
                    _panoramicLayer = new OpenLayers.Layer.Vector("Zone Accquisition");

                    // _itineraryLayer **********************************************
                    _itineraryLayer = new OpenLayers.Layer.Vector("Biking Navigation");
                    _viewer.getMap().addLayer(_itineraryLayer);

                    _laserLayer = new OpenLayers.Layer.Vector("Laser Mesure");
                    _viewer.getMap().addLayer(_laserLayer);

                    _geoveloLayer= new OpenLayers.Layer.Vector("geovelo");
                    _viewer.getMap().addLayer(_geoveloLayer);

                    _selectControl = new OpenLayers.Control.SelectFeature(_panoramicLayer, {
                        onSelect: function(feature)
                        {
                            _selectedFeature = feature;
                            var popup = new OpenLayers.Popup.FramedCloud("Pano",
                                    feature.geometry.getBounds().getCenterLonLat(),
                                    null,
                                    "<div style='font-size:.8em'>\n\
                            <p>Easting : " + feature.attributes.easting + "</p>\n\
                            <p>Northing : " + feature.attributes.northing + "\n\
                            <p>Distance to position : " + feature.attributes.distance + "<p>\n\
                            <p>Orientation to position : " + feature.attributes.orientation + "<p>\n\
                        </div>",
                                    null, true, function(evt) {
                                        _selectControl.unselect(_selectedFeature)
                                    });
                            feature.popup = popup;
                        //_viewer.getMap().addPopup(popup);
                        },
                        onUnselect: function(feature) {
                            _viewer.getMap().removePopup(feature.popup);
                            feature.popup.destroy();
                            feature.popup = null;
                        },
                    hover: false
                    });
                    _viewer.getMap().addLayer(_panoramicLayer);

                //_viewer.getMap().addControl(_selectControl);
                //_selectControl.activate();
                }

                var initPos = currentPosGeom.clone();
                initPos.transform(_viewer.getMap().getProjectionObject(), new OpenLayers.Projection("CRS:84"))

                _viewer.getMap().setCenterAtLonLat(initPos.x, initPos.y, 17);

                _viewer.openToolsPanel(false);
                _viewer.openLayersPanel(false);
                _viewer.setInformationPanelVisibility(false);
                _viewer.setToolsPanelVisibility(false);

                _initialized = true;
                _initializing = false;

                //  Cartography.rotatePositionMarker(-90);//_heading); console.log("HEADIIIING",_heading);
            }

            //Displays the Geoportal map on the screen
            function displayMap()
            {
                var sentContract = Geoportal.GeoRMHandler.getConfig([_apiKey], null, 'http://gpp3-wxs.ign.fr/autoconf/$key$/',
                        {
                            onContractsComplete: initMap
                        });

                if (sentContract == 0)
                {
                    console.error("IT.Mapping.addGeoportalMap: no contract sent");
                }
            }

            // EVENT MANAGEMENT
            //*************************************
            var _events = {
                MOVE: function() {
                    Cartography.movePositionOnMap();
                }
            };

            //********************************************************************************************************/

            /**
             * Manages the 2D map of iTOWNS and provide interface to interact with it
             * @export Cartography
             * @author Mathieu Benard IGN
             */
            var Cartography = {
                /**
                 * Init the 2D map in the web browser
                 * @param {String} mapDivId Id of the div element containing the map in the html page
                 * @param {String} geoportalKey The key provide by IGN for the user contract
                 * @param {Object} initPos Initial position in the map in Lambert 93
                 * @param initPos.easting Easting coordinate
                 * @param initPos.northing Northing coordinate
                 */
                init: function(mapDivId, geoportalKey, initPos) {
                    _mapDivId = mapDivId;
                    _apiKey = geoportalKey;
                    _currentPos = {
                        easting: parseFloat(initPos.easting),
                        northing: parseFloat(initPos.northing)
                    };
                    _heading: parseFloat(initPos.heading) || 0;

                    displayMap();

                },
                
                rotatePositionMarker: function(angle) {

                    var feat = _currentPosLayer.features[0];
                    feat.style.rotation = (180 * angle / Math.PI) % 360;
                    for (var i = 0, l = _currentPosLayer.features.length; i < l; i++) {
                        _currentPosLayer.drawFeature(_currentPosLayer.features[i]);
                    }
                    // _currentPosLayer.drawFeature(feat);
                },
                movePositionOnMap: function(pos) {

                    if (typeof pos === "undefined") {
                        //we assumed that the current panoramic position has been udpated
                        pos =
                                {
                                    x: Panoramic.getPanoInfos().easting - _currentPos.easting,
                                    y: Panoramic.getPanoInfos().northing - _currentPos.northing
                                };
                    }

                    _currentPos.easting = _currentPos.easting + pos.x;
                    _currentPos.northing = _currentPos.northing + pos.y;

                    var map = _viewer.getMap();
                    var geom = _currentPosLayer.features[0].geometry;


                    //first we place the geometry in the lambert 93 coordinate system
                    geom.transform(map.getProjectionObject(), new OpenLayers.Projection("EPSG:2154"));

                    //then we apply the translation
                    geom.move(pos.x, pos.y);

                    //then we replace the geometry in the viewer map reference system
                    geom.transform(new OpenLayers.Projection("EPSG:2154"), map.getProjectionObject());
                    _currentPosLayer.drawFeature(_currentPosLayer.features[0]);

                    var lonlat = new OpenLayers.LonLat(geom.x, geom.y);
                    map.setCenter(lonlat);
                },
                getCurrentPosition : function(){
                     return new THREE.Vector3(_currentPos.easting, 0 , _currentPos.northing);
                },
                addPanoPosition: function(featureAttributes) {

                    if (_initialized == true) {
                        var currentPosGeom = new OpenLayers.Geometry.Point(featureAttributes.easting, featureAttributes.northing);
                        currentPosGeom = currentPosGeom.transform(new OpenLayers.Projection("EPSG:2154"), _viewer.getMap().getProjectionObject());

                        var featStyle = {
                            pointRadius: 2
                        };

                        var currentPosFeat = new OpenLayers.Feature.Vector(currentPosGeom, featureAttributes, featStyle);
                        _panoramicLayer.addFeatures([currentPosFeat]);
                    }
                    else if (_viewer == null && _initializing == true) {
                        var that = this;
                        window.setTimeout(function() {
                            that.addPanoPosition(featureAttributes);
                        }, 200);
                    }
                },
                inMap: function(x, y)
                {
                    Utils.inDivArea(x, y, "#" + _mapDivId);
                },
                hasPanoramixLayer: function() {
                    return _panoramicLayer != null;
                },
                cleanPanoramix: function() {
                    _panoramicLayer.removeAllFeatures();
                },
                isDragging: function() {
                    return _isDragging;
                },
                drawSegment: function(p1, p2) {

                	if (p1.z && p2.z) {
                        var point1 = new OpenLayers.Geometry.Point(p1.x, p1.z);
                        var point2 = new OpenLayers.Geometry.Point(p2.x, p2.z);
                	} else {
                		var point1 = new OpenLayers.Geometry.Point(p1.x, p1.y);
                        var point2 = new OpenLayers.Geometry.Point(p2.x, p2.y);
                	}

                    point1 = point1.transform(new OpenLayers.Projection("CRS:84"), _viewer.getMap().getProjectionObject());
                    point2 = point2.transform(new OpenLayers.Projection("CRS:84"), _viewer.getMap().getProjectionObject());

                    var featStyle = {
                        strokeWidth: 1,
                        strokeColor: "#ff0000"
                    };

                    var geomSegment = new OpenLayers.Geometry.LineString([point1, point2]);
                    var featSegment = new OpenLayers.Feature.Vector(geomSegment, {}, featStyle);
                    //var points = [new OpenLayers.Feature.Vector(point1, {}, featStyle), new OpenLayers.Feature.Vector(point2, {}, featStyle)];
                    _itineraryLayer.addFeatures([featSegment]);
                },
                processEvent: function(event) {
                    if (_events[event]) {
                        _events[event]();
                    }
                },
                // Add a point (three.Vector3) in projection specified
                addPointAtPosition: function(point, projcode) {
                    projcode = projcode || "CRS:84";
                    //var pointLayer = new OpenLayers.Layer.Vector("Panoramix");
                    var featStyle = {
                        pointRadius: 2,
                        strokeColor: "#cc00cc"
                    };
                    if ( !point.z) {
                    	var currentPosGeom = new OpenLayers.Geometry.Point(point.x, point.y);
                    } else {
                    	var currentPosGeom = new OpenLayers.Geometry.Point(point.x, point.z);
                    }

                    currentPosGeom = currentPosGeom.transform(new OpenLayers.Projection(projcode), _viewer.getMap().getProjectionObject());

                    var currentPosFeat = new OpenLayers.Feature.Vector(currentPosGeom, null, featStyle);
                    _itineraryLayer.addFeatures([currentPosFeat]);

                },
                 // Add a point (three.Vector3) in projection specified
                addPointOnMap: function(point, projcode,layer,featStyle,description) {

                    projcode = projcode || "CRS:84";
                    var currentPosGeom = new OpenLayers.Geometry.Point(point.x, point.z);
                    currentPosGeom = currentPosGeom.transform(new OpenLayers.Projection(projcode), _viewer.getMap().getProjectionObject());

                    var currentPosFeat = new OpenLayers.Feature.Vector(currentPosGeom, {name:description}, featStyle);
                    layer.addFeatures([currentPosFeat]);
                },
                // Convert a point from projection 1 to projection 2 using EPSG code
                convertCoord: function(point, projection1, projection2) {
                    var point1 = new OpenLayers.Geometry.Point(point.x, point.y);
                    point1 = point1.transform(new OpenLayers.Projection(projection1), new OpenLayers.Projection(projection2));
                    return point1;
                },
                // Convert a point from projection 1 to projection 2 using EPSG code
                convertCoordVec3: function(point, projection1, projection2) {
                    var point1 = new OpenLayers.Geometry.Point(point.x, point.z);
                    point1 = point1.transform(new OpenLayers.Projection(projection1), new OpenLayers.Projection(projection2));
                    return new THREE.Vector3(point1.x, point.y, point1.y);
                },
                // reverse param for geocoding. If reverse then we search an address from a pos
                buildOLSRequest: function(location, reverse) {

                    var request = '<?xml version="1.0" encoding="UTF-8"?><XLS xmlns:gml="http://www.opengis.net/gml"\
                       xmlns="http://www.opengis.net/xls" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\
                       version="1.2"  xsi:schemaLocation="http://www.opengis.net/xls http://schemas.opengis.net/ols/1.2/olsAll.xsd">\
                       <RequestHeader srsName="epsg:2154"/><Request maximumResponses="10" methodName="GeocodeRequest" version="1.2">';

                    if (!reverse) {
                        request += '<GeocodeRequest><Address countryCode="StreetAddress,PositionOfInterest"><freeFormAddress>';
                        request += location + '</freeFormAddress></Address></GeocodeRequest></Request></XLS>';
                    }
                    else {
                        request += ' <ReverseGeocodeRequest><!-- countryCode="StreetAddress" --><ReverseGeocodePreference>StreetAddress</ReverseGeocodePreference><Position><gml:Point><gml:pos>';
                        request += location + '</gml:pos></gml:Point></Position></ReverseGeocodeRequest></Request></XLS>';
                    }

                    return encodeURI(request);
                },
                /**
                 * Send an OpenLocationService (OLS) request in a free form address with the paramater location.
                 * If the request succeed and is not empty, it looks for the closest panoramic and if one exists, it
                 * moves to that panoramic.
                 * ADD ALEX, reverse parameter: boolean if true then reverse geocode (pos -> address)
                 */
                sendOLSRequest: function(location, reverse) {

                    if (location !== "") { //location is empty when enter is keyed with completion
                        var OLSRequest;
                        if (!reverse)
                            OLSRequest = this.buildOLSRequest(location, false);
                        else
                            OLSRequest = this.buildOLSRequest(location, true);

                        $.getJSON("http://wxs.ign.fr/" + Config.geoAPIKey + "/geoportail/ols?xls=" + OLSRequest + "&output=json&callback=?")
                                .done(function(data) {
                                    var format = new OpenLayers.Format.XLS();
                                    var output = format.read(data.xml);
                                    if (output.getNbBodies() > 0) { //the OLS service returns something
                                        if (!reverse) {
                                            var firstGeocodeResponse = output.getBodies()[0].getResponseParameters().getGeocodeResponseList()[0];
                                            if (firstGeocodeResponse.getNbGeocodedAddresses() > 0) { //at least one location has been found
                                                var position = firstGeocodeResponse.getGeocodedAddresses()[0].lonlat;
                                                console.log('pos',position);
                                                require("Navigation").goToClosestPosition({x: position.y, y: 0, z: position.x}, {distance: 250});
                                            }
                                        } else {
                                            var firstGeocodeResponse = output.getBodies()[0].getResponseParameters();//.getGeocodeResponseList()[0];

                                            if (firstGeocodeResponse.getNbReverseGeocodedLocations() > 0) {//getNbReverseGeocodedLocations() > 0) { //at least one location has been found
                                                var street = firstGeocodeResponse.getReverseGeocodedLocations()[0];
                                               // console.log(street.address);
                                                street = street.address.toString().replace('[Ville]', '');
                                                street = street.substring(0,street.indexOf('['));
                                                street = street.substring(0,street.lastIndexOf(','));
                                                //console.log(street);
                                                $(".localisation-text").text(street + "   |   Easting : " + Panoramic.getPanoInfos().easting + " - Northing : " + Panoramic.getPanoInfos().northing + " (lambert 93)");
                                                //return street;
                                            }
                                        }
                                    }
                                })
                                .fail(function(data) {
                                    console.error("something went wrong");
                                });

                    }
                },
                //*********************************** 3D Carto ******************************************

                create3DCarto: function(point, level, radius) {

                    this.loadTilesAroundPos(point, level, radius);

                    // We no have the array with all the tiles url to load: arrayTiles
                    return _arrayTiles;
                },

                        // WMTS ***********************************************************************************************************
                        // Load tiles around a specified position at a zoom level
                        //  and a radius for area size to load
                        loadTilesAroundPos: function(point, level, radius) {

                            // get tile closest to my pos     (cord in tile col/row)
                            var tileInfo = this.getTileCoordAtPos(point, level); // ex {x:250000, y:2054544}

                            // Get this tile position in Lamb93
                            var tilePosX = tileInfo.x * _sizeTile + _topLeftCorner.x;
                            var tilePosY = -tileInfo.y * _sizeTile + _topLeftCorner.y;
                            console.log('tilPosMercator', tilePosX, tilePosY);

                            var closestTileAtpos = {x: tileInfo.x, y: tileInfo.y};

                            for (var i = -radius; i < radius; ++i) {

                                for (var j = -radius; j < radius; ++j) {

                                    var xMercator = tilePosX + i * _sizeTile;
                                    var yMercator = tilePosY + j * _sizeTile;
                                    var Lamb93 = this.convertCoord({x: xMercator, y: yMercator}, "EPSG:3857", "EPSG:2154");
                                    var tilUrlCoord = {x: closestTileAtpos.x + i, y: closestTileAtpos.y - j};
                                    this.loadTileAtCoord({x: tilUrlCoord.x, y: tilUrlCoord.y},
                                    level,
                                            {x: Lamb93.x, y: Lamb93.y}
                                    );
                                }
                            }

                        },

                // We compute the size of the tiles in meters in Mercator sys
                computeSizeTile: function(level) {

                    var scaleDenominator = 1066.3647919248918304;
                    switch (level) {
                        case 19:
                            scaleDenominator = 1066.3647919248918304;
                            break;
                        case 18:
                            scaleDenominator = 2132.7295838497840572;
                            break;
                        case 17:
                            scaleDenominator = 4265.4591676995681144;
                            break;
                        case 16:
                            scaleDenominator = 8530.9183353991362289;
                            break;
                        case 15:
                            scaleDenominator = 17061.8366707982724577;
                            break;
                        case 14:
                            scaleDenominator = 34123.6733415965449154;
                            break;
                    }

                    var sizeTile = (scaleDenominator * 0.28 / 1000) * 256;
                    //console.log(sizeTile);
                    return sizeTile;
                },

                getTileCoordAtPos: function(point, sizeTile) {

                    var coordTile = {x: 0, y: 0};
                    var p = this.convertCoord(point, "EPSG:2154", "EPSG:3857");
                    //console.log('current pos in Mercator: ',p);
                    var x = p.x - _topLeftCorner.x;
                    var y = _topLeftCorner.y - p.y;

                    coordTile.x = Math.floor(x / sizeTile);
                    coordTile.y = Math.floor(y / sizeTile);

                    return {x: coordTile.x, y: coordTile.y}//, px:p.x, py:p.y}                  },
                },
                loadTileAtCoord: function(coordTile, level, point93) {

                    this.getTileImgURL(level, coordTile.y, coordTile.x, point93);

                },
                getTileImgURL: function(level, tileRow, tileCol, point93) {

                    var formatImage = "png";  // jpeg
                    var zone = ".PARIS"; // ""   if empty then national ortho else paris for high reso on capital
                    var key = "z0sxz2r5pnuy669h11vlm982";
                    var urlBase = "http://wxs-i.ign.fr/" + key;
                    urlBase += "/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=";
                    urlBase += level + "&TILEROW=" + tileRow + "&TILECOL=" + tileCol + "&FORMAT=image%2F" + formatImage;
                    console.log(urlBase);
                    _arrayTiles.push(urlBase);
                    _arrayPosTiles.push(point93);
                },
                // WMS ***********************************************************************************************************

                getViewer : function(){
                    return _viewer;
                },

                loadTilesAroundPosWMS: function(point, level, radius) {

                    // get tile closest to my pos     (cord in tile col/row)
                    var tileInfo = this.getTileCoordAtPos(point, level); // ex {x:250000, y:2054544}

                    // Get this tile position in Lamb93
                    var tilePosX = tileInfo.x * _sizeTile + _topLeftCorner.x;
                    var tilePosY = -tileInfo.y * _sizeTile + _topLeftCorner.y;
                    console.log('tilPosMercator', tilePosX, tilePosY);

                    var closestTileAtpos = {x: tileInfo.x, y: tileInfo.y};

                    for (var i = -radius; i < radius; ++i) {

                        for (var j = -radius; j < radius; ++j) {

                            var xMercator = tilePosX + i * _sizeTile;
                            var yMercator = tilePosY + j * _sizeTile;
                            var Lamb93 = this.convertCoord({x: xMercator, y: yMercator}, "EPSG:3857", "EPSG:2154");
                            var tilUrlCoord = {x: closestTileAtpos.x + i, y: closestTileAtpos.y - j};
                            this.loadTileAtCoord({x: tilUrlCoord.x, y: tilUrlCoord.y},
                            level,
                                    {x: Lamb93.x, y: Lamb93.y}
                            );
                        }
                    }

                },
                getArrayTiles: function() {
                    return _arrayTiles;
                },
                getArrayPosTiles: function() {
                    return _arrayPosTiles;
                },
                showZoneAccquisition: function() {
                    var that = this;
                    var featStyle = {
                            pointRadius : 6,
                            fill        : true,
                            fillColor   : "rgba(0,127,127,0.75)",
                            fillOpacity : 0.5,
                            stroke      : false
                    };
                     if (_viewer != null) {
                            $.post("php/getAllPanoPos.php",
                                    function(jsondata) {
                                            var arr = JSON.parse(jsondata);
                                            for (var i = 0; i < arr.length; i++) {
                                                Cartography.addPointOnMap(arr[i], "EPSG:2154",_panoramicLayer,featStyle);
                                            }
                            });
                     } else {
                            window.setTimeout(function() {
                                       that.showZoneAccquisition();
                             }, 200);
                     }
                            console.log("add zone accquisition!");
                },

                getLayerFromName: function(name){

                    var layer
                    switch(name){
                        case "geovelo": layer = _geoveloLayer; break;
                        default: layer = _laserLayer; break;
                    }

                    return layer;
                },

                showPointMeasureOnMap: function(pt,featStyle,layer,description) {
                    var that = this;
                    var layer = this.getLayerFromName(layer) || _laserLayer;
                    featStyle = featStyle || {
                            pointRadius : 3,
                            fill        : true,
                            fillColor   : "#ff00ff",
                            fillOpacity : 0.7,
                            stroke      : false
                    };
                    if (_viewer != null) {
                            Cartography.addPointOnMap(pt, "EPSG:2154",layer,featStyle,description);
                    } else {
                            window.setTimeout(function() {
                                            that.showPointMeasureOnMap(pt,null,layer,featStyle,description);
                                 }, 200);
                    }
                },

                showLineMeasureOnMap: function(p1,p2,layer, projcode,featStyle) {
                    var that  = this;
                    projcode  = projcode  ||  "CRS:84";
                    featStyle = featStyle || {
                        strokeWidth: 1.5,
                        strokeColor: "#ffaa00"
                    };
                    if (_viewer != null) {
                            Cartography.drawLineOnMap(p1,p2,layer,projcode,featStyle);
                    } else {
                            window.setTimeout(function() {
                                            that.showLineMeasureOnMap(p1,p2,layer, projcode,featStyle);
                                 }, 200);
                    }
                },


                drawLineOnMap: function(p1, p2,layer,projcode,featStyle) {
                    var point1 = new OpenLayers.Geometry.Point(p1.x, p1.z);
                        point1 = point1.transform(new OpenLayers.Projection(projcode), _viewer.getMap().getProjectionObject());
                    var point2 = new OpenLayers.Geometry.Point(p2.x, p2.z);
                        point2 = point2.transform(new OpenLayers.Projection(projcode), _viewer.getMap().getProjectionObject());
                    var geomSegment = new OpenLayers.Geometry.LineString([point1, point2]);
                    var featSegment = new OpenLayers.Feature.Vector(geomSegment, {}, featStyle);
                        layer.addFeatures([featSegment]);
                },

                removeAllFeature : function(layer){
                    layer.removeAllFeatures();
                },

                getLaserLayer : function(){
                    return _laserLayer;
                },

                getItineraryLayer: function() {
                	return _itineraryLayer;
                }

            };


            return Cartography;

        }
);
