define(
        ['jquery', 'three', 'Events', 'Cartography', 'Navigation', 'Itinerary', 'LaserCloud', 'Panoramic', 'GraphicEngine', 'Draw',
            'Config', 'Geonames', 'Measure', 'MeshManager', 'lib/postprocessing/WeatherEffects', 'Import', 'Carousel', 'Cartography3D', 'prefixfree', 'jqueryui'],
        function($, THREE, Events, Cartography, Navigation, Itinerary, LaserCloud,
                Panoramic, gfxEngine, Draw, Config, Geonames, Measure, MeshManager, WeatherEffects, Import,  Carousel, Cartography3D ) {

            //****************************** PRIVATE MEMBERS OF MODULE ***********************************************

            // ATTRIBUTES
            //*************************************

            //DOM elements cache (avoid DOM request by jQuery)
            var _$modelList = $(".model-list");
            var _$emptyElem = _$modelList.find(".empty-list");
            var _transformButtons = {
                translate: $("#btTranslate"),
                rotate: $("#btRotate"),
                scale: $("#btScale")
            };
            var _currentTransform = "";
            var lastOrder = '';
            var _tabClassif = [];

            // var added for new functions
            var _carousel = null;
            var _rot = null;
            var _tran = null;
            var _rotAngle = 0;
            var carousel3D = null;
            var curFocus = null;
            var _listIti = [];
            var _vps = [];
            var _iti = {
            	"id": null,
            	"name": null,
            	"descp": null,
        		"viewPoints": []
        	};

        	var _prePoi = 0;
        	var _curPoi = 0;
        	var _subItis = [];
        	var _pts93 = [];
        	var _order = 0;

        	var _viewMode = false;
            // METHODES
            //*************************************

            function registerConnectionEvent() {
                $("#connect").submit(function() {
                    $.post("php/manageConnection.php",
                            {
                                login: $("#login").val(),
                                pass: $("#pass").val()

                            });
                });
            }

            function initTransformButtons() {

                for (var transform in _transformButtons) {
                    var $button = _transformButtons[transform];
                    (function(transform, $button) {
                        $button.click(function() {
                            if ($button.hasClass("control-button--active") === false) {
                                ModelManager.hideGizmo();
                                _currentTransform = "";
                            }
                            else {
                                ModelManager.setTransform(transform);
                                _currentTransform = transform;
                            }
                        });
                    })(transform, $button);
                }
            }

            function inputModelChanged() {
                $("#inputModel").change(function() {
                    GUI.loadModel(this.files[0]);
                });
            }

            function btImportModelClicked() {
                $("#btImportModel").click(function(e) {
                    $("#inputModel").trigger('click');
                });
            }

            function btSaveModelClicked() {
                $("#btSaveModel").click(function(e) {
                    ModelManager.saveDB();
                });
            }

            function btDeleteModelClicked() {
                var $selection = $(this).parent(), //_$modelList.find(".selected"),
                        nbElems = $selection.length;

                if (nbElems > 0) {
                    for (var i = 0; i < nbElems; i++) {
                        ModelManager.deleteModel($selection[i].id);
                    }
                    $selection.remove();

                    if (ModelManager.modelCount() === 0) {
                        _$modelList.append(_$emptyElem);

                        for (var transform in _transformButtons) {
                            _transformButtons[transform].attr("disabled", "true");
                        }
                    }
                }
            }

            /**
             * @author VIncent De Oliveira - ENSG
             * Init visual aspect of GUI
             */
            function initDOMElements() {
                var forEach = Array.prototype.forEach;
                var classes = {
                    sidebar: 'sidebar',
                    sidebarClosed: 'sidebar--closed',
                    panel: 'panel--expandable',
                    panelExpanded: 'panel--expanded',
                    panelCollapsed: 'panel--collapsed',
                    panelActive: 'panel--active',
                    panelInner: 'panel-inner',
                    panelTitle: 'panel-titlePrimary',
                    controlRange: 'control-range',
                    controlRangeHandle: 'control-range-handle',
                    controlRangeMin: 'control-range-min',
                    controlButtonGroupItem: 'control--buttonGroup-item',
                    controlButton: 'control-button',
                    controlButtonActivable: 'control-button-activable',
                    controlButtonActive: 'control-button--active'
                };
                var datas = {
                    height: 'data-height',
                    rangeMin: 'data-min',
                    rangeMax: 'data-max',
                    rangeVal: 'data-value'
                };
                function class2sel(myClass) {
                    return '.' + myClass;
                }

                function switchLogo() {
                    var logo = document.querySelector('.logo img');
                    if (logo.classList.contains('logo-small')) {
                        logo.src = 'images/itowns.png';
                        logo.classList.remove('logo-small');
                    } else {
                        logo.src = 'images/itowns-small.png';
                        logo.classList.add('logo-small');
                    }
                }

                var allPanel = document.querySelectorAll(class2sel(classes.panel));
                forEach.call(allPanel, function(elem) {
                    var inner = elem.querySelector(class2sel(classes.panelInner));
                    var title = elem.querySelector(class2sel(classes.panelTitle));
                    var styles = window.getComputedStyle(inner);
                    elem.setAttribute(datas.height, styles.getPropertyValue('height'));
                    if (!elem.classList.contains(classes.panelExpanded)) {
                        elem.classList.add(classes.panelCollapsed);
                    } else {
                        inner.style.height = elem.getAttribute(datas.height);
                    }

                    // click event
                    title.addEventListener('click', function(e) {
                        var panel = this.parentNode;
                        var panelInner = panel.querySelector(class2sel(classes.panelInner));
                        panelInner.style.height = panel.getAttribute(datas.height);
                        // open sidebar
                        if (document.querySelector(class2sel(classes.sidebar)).classList.contains(classes.sidebarClosed)) {
                            document.querySelector(class2sel(classes.sidebar)).classList.remove(classes.sidebarClosed);
                            switchLogo();
                        }

                        // toggle --expanded
                        panel.classList.toggle(classes.panelExpanded);
                        // toggle --collapsed
                        panel.classList.toggle(classes.panelCollapsed);
                        if (!panel.classList.contains(classes.panelExpanded)) {
                            panel.querySelector(class2sel(classes.panelInner)).removeAttribute('style');
                        }
                    }, false);
                });
                var allRange = document.querySelectorAll(class2sel(classes.controlRange));
                forEach.call(allRange, function(elem) {

                    var handle = document.createElement('a');
                    handle.className = "ui-slider-handle " + classes.controlRangeHandle;
                    elem.appendChild(handle);
                    var min = +elem.getAttribute(datas.rangeMin) || 0;
                    var max = +elem.getAttribute(datas.rangeMax) || 100;
                    var val = +elem.getAttribute(datas.rangeVal) || Math.floor(Math.random() * 100);
                    var opts = {
                        animate: 200,
                        range: 'min',
                        min: min,
                        max: max,
                        value: val,
                        create: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            var span = document.createElement('span');
                            span.innerHTML = val;
                            label.appendChild(span)
                        },
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                        }
                    };
                    // slider
                    $(elem).slider(opts);
                    elem.querySelector('.ui-slider-range-min').classList.add(classes.controlRangeMin);
                });
                var allActivableButton = document.querySelectorAll(class2sel(classes.controlButtonActivable));
                forEach.call(allActivableButton, function(button) {
                    button.addEventListener('click', function(e) {

                        // if already active
                        if (this.classList.contains(classes.controlButtonActive)) {
                            // no longer active
                            this.classList.remove(classes.controlButtonActive);
                        }
                        else {
                            // get Parent
                            var parent = this.parentNode;
                            if (parent.classList.contains(classes.controlButtonGroupItem)) {
                                parent = parent.parentNode;
                            }
                            // get all buttons in same Parent
                            var buttonsInParent = parent.querySelectorAll(class2sel(classes.controlButtonActivable));
                            forEach.call(buttonsInParent, function(b) {
                                // remove all active (only one though)
                                b.classList.remove(classes.controlButtonActive);
                            });
                            // become active
                            this.classList.add(classes.controlButtonActive);
                        }
                    }, false);
                });

                var allButton = document.querySelectorAll(class2sel(classes.controlButton));
                forEach.call(allButton, function(button) {
                    button.addEventListener('mousedown', function(e) {
                        this.classList.add(classes.controlButtonActive);
                    }, false);

                    button.addEventListener('mouseup', function(e) {
                        this.classList.remove(classes.controlButtonActive);
                    }, false);

                    button.addEventListener('mouseout', function(e) {
                        if (this.classList.contains(classes.controlButtonActive)) {
                            this.classList.remove(classes.controlButtonActive);
                        }
                    }, false);

                });

                var sidebar = document.querySelector('.sidebar');
                var arrow = document.createElement('div');
                arrow.classList.add('sidebar-toggle');
                arrow.innerHTML = '<div>▾</div>';
                arrow.addEventListener('click', function() {
                    var allPanelExpanded = document.querySelectorAll(class2sel(classes.panelExpanded));
                    forEach.call(allPanelExpanded, function(panel) {
                        var evt = document.createEvent('MouseEvents');
                        evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                        panel.querySelector(class2sel(classes.panelTitle)).dispatchEvent(evt);
                    });
                    sidebar.classList.toggle('sidebar--closed');
                    switchLogo();
                }, false);
                sidebar.appendChild(arrow);
                sidebar.style.height = window.screen.availHeight + "px";



                //Custom event registration
                registerConnectionEvent();
                initTransformButtons();
                btDeleteModelClicked()
                inputModelChanged();
                btImportModelClicked();
                btSaveModelClicked();
                $("#container").mouseenter(function() {
                    $(this).focus();
                });



             /// CLASSIF GENERATION *************************
                var options=''; //<option value="other" label="other"></option>
                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) {
                      var xmlDoc= xhr.responseXML;
                      var classes = xmlDoc.getElementsByTagName("class");

                      for(var i = 0; i<classes.length;++i){

                          var id,fr,en,desc;
                          var id = classes[i].attributes.id.nodeValue;
                          if(classes[i].attributes.fr) {
                              fr = classes[i].attributes.fr.nodeValue;
                              _tabClassif[fr] = id;
                          }
                          if(classes[i].attributes.en) en =classes[i].attributes.en.nodeValue;

                          //console.log(id,fr,en);
                          options += '<option value="'+fr+'" label="'+en+'" />';
                      }
                      $('#classID').append(options);
                    }
                }
                xhr.open('GET', './classes.xml', true);
                xhr.send(null);



            }



            // DOM EVENTS HANDLERS
            //*************************************

            //************** SEARCH INPUT
            function textInputChange(e) {

                // console.log("ahah! ",e.currentTarget.value);
                if (e.keyCode == 13) {  // Enter key

                    analyseEntry(e.currentTarget.value);
                }
            }

            // Function launched when click on search or 'aller a'
            function search(a) {
                // console.log('search',$("#text1").val());
                var p = $("#text1").val();
                analyseEntry(p);

            }

            // Panoname | address | Coordinate | keyword for itinerary
            function analyseEntry(p) {

                if (p.substring(0, 6) == "balade") {

                    if (!Navigation.autoPlay)
                        Itinerary.loadBaladeFromAtoB();
                    else
                        Itinerary.stopItinerary();
                }
                else
                if (parseFloat(p.substring(3, 4)) >= 0.0) {  // Coordinate
                    var tabCoord = p.split(" ");
                    //Cartography.sendOLSRequest(e.currentTarget.value,true);
                    Navigation.goToClosestPosition({x: tabCoord[0], y: 0, z: tabCoord[1]}, {distance: 250});
                } else
                if (p.indexOf('_') > 0) {
                    Navigation.loadPanoFromNameAndLookAtIntersection(p);
                }    // Pano name
                else
                    Cartography.sendOLSRequest(p, false);  // Address


            }

            //********************************************************************



            function ckbGeonamesLayerChange(e) {
                if ($(this).prop("checked") === true) {
                    Geonames.showLayer();
                }
                else {
                    Geonames.hideLayer();
                }
            }


            function checkbox2PanoramicLayerChange(e) {

                Panoramic.setVisibility($(this).prop("checked"));
           /*     if (gfxEngine.getClearColor().b == 1)
                    gfxEngine.setClearColor(new THREE.Color(0x000000, 1));
                else
                    gfxEngine.setClearColor(new THREE.Color(0xffffff, 1));
           */
            }


            // TEMP FES ortho paris
            function checkbox3OrthophotoLayerChange(e) {

                MeshManager.setOrthoPhotoOn($(this).prop("checked"));
                MeshManager.setVisibilityParisOrtho($(this).prop("checked"));

            }


            //GEOGRAPHICALGRIDSYSTEMS.MAPS
            function checkbox3OrthophotoLayerChangeSAVE(e) {

                MeshManager.setOrthoPhotoOn($(this).prop("checked"));

                // We create Map and effect
                if (MeshManager.getOrthoPhotoOn()) {

                    var layer = "ORTHOIMAGERY.ORTHOPHOTOS";//.PARIS";
                    var info = Panoramic.getPanoInfos();
                    if (info.easting > 656000 || info.easting < 640000 || info.northing > 6869000 || info.northing < 6860000)
                        layer = "ORTHOIMAGERY.ORTHOPHOTOS";

                    var currentPos = {x: info.easting, z: info.northing};

                    MeshManager.generateCartoPlane({x: currentPos.x, y: currentPos.z}, 18, 10, layer, "jpeg");
			//MeshManager.generateCartoPlanePARIS({x: currentPos.x, y: currentPos.z}, 18, 10, layer, "jpeg");

                } else {
                    // We delete map and effects
                    MeshManager.removeMapMeshes();
                }

            }


            function checkbox4MNTLayerChange(e) {

                MeshManager.setShowDTM($(this).prop("checked"));

            }


            function checkbox2LaserLayerChange(e) {

                if (!LaserCloud.initiated) {
                    Measure.init();

                    LaserCloud.init(gfxEngine.getZero()); //Init itself and its shaders
                    gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                    LaserCloud.launchLaserAroundCurrentTime(10, 11);
                }
                else {
                    if (LaserCloud.getNotLoaded() && !LaserCloud.getLocalMode())
                        LaserCloud.launchLaserAroundCurrentTime(10, 11);

                    LaserCloud.setVisibility($(this).prop("checked"));
                }
            }
            
            
            

            function setColorBackGround() {
                if (gfxEngine.getClearColor().b == 1)
                     gfxEngine.setClearColor(new THREE.Color(0x000000, 1));
                else
                     gfxEngine.setClearColor(new THREE.Color(0xffffff, 1));

            }

            function showBati3D(e){
                if (!Cartography3D.isCartoInitialized()) {
                        //generate sky box
                        MeshManager.generateSkyBox();
                        //load Bati 3D


                        Cartography3D.initCarto3D();
                        Cartography3D.setActivatedCarte3D($(this).prop("checked"));
                        //desactive panoramique
                        $("#checkbox2").prop("checked", false);
                        Panoramic.setVisibility(false);
                     //s   setColorBackGround();
                }
                else {
                        Cartography3D.setVisibility($(this).prop("checked"));
                        Panoramic.setVisibility(!($(this).prop("checked")));
                        MeshManager.removeSkyBox();
                        //Cartography3D.setDisableDalleSets();

                }
            }

        // Go up and load bati3D
            function upClicked() {

                gfxEngine.setBase3DGlasses(200);
                console.log("going up");
              if (!Cartography3D.isCartoInitialized()) {
                        //generate sky box
                        MeshManager.generateSkyBox();
                        //load Bati 3D

                       // Birds.createBirds(300);
                       // Birds.play();


                        Cartography3D.initCarto3D();
                        Cartography3D.setActivatedCarte3D(true);
                        //desactive panoramique
                        $("#checkbox2").prop("checked", false);
                        Panoramic.setVisibility(false);
                    //    setColorBackGround();
                }
                else {
                        Cartography3D.setActivatedCarte3D(true);
                        Cartography3D.setVisibility(true);
                        Cartography3D.setOpacity(1);

                        MeshManager.setSkyBoxVisibility(true);
                                //Cartography3D.tweenGeneralOpacityUP();  // BUG
                        //desactive panoramique
                        $("#checkbox2").prop("checked", false);
                        Panoramic.setVisibility(false);
                        gfxEngine.translateCameraSmoothly(-10001,100,0);   // Translate to 100 meters up
                        //Cartography3D.setVisibility($(this).prop("checked"));
                       // Panoramic.setVisibility(!($(this).prop("checked")));
                        //MeshManager.removeSkyBox();
                        //Cartography3D.setDisableDalleSets();

                }

            }
            
            
            function reportClicked(){
                
            }

            //Laser Measure

            function laserPointMeasure(e) {
                //loading laser points!
                if (!$("#checkbox1").prop("checked")) {
                    if (!LaserCloud.initiated) {
                        Measure.init();
                        LaserCloud.init(gfxEngine.getZero()); //Init itself and its shaders
                        gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                        LaserCloud.launchLaserAroundCurrentTime(10, 11);
                    }
                    else {
                        if (LaserCloud.getNotLoaded())
                            LaserCloud.launchLaserAroundCurrentTime(10, 11);

                    }

                    $("#checkbox1").prop("checked", true);
                    LaserCloud.setVisibility(true);
                }
                LaserCloud.btnSwitchPoint = !LaserCloud.btnSwitchPoint;

                if (LaserCloud.btnSwitchLine || LaserCloud.btnSwitchVolume) {
                    LaserCloud.btnSwitchLine = false;
                    LaserCloud.btnSwitchVolume = false;
                }
            }

            function computeNormal(e) {
                if ($(this).prop("checked") && $("#chbxSnappON").prop("checked", true)) {
                    //snapp on laser
                    LaserCloud.setComputeNormalOn(true);

                } else if ($(this).prop("checked") && !$("#checkbox1").prop("checked")) {
                    $(this).prop("checked", false);
                }
            }


            function laserLineMeasure(e) {
                //loading laser points!
                if (!$("#checkbox1").prop("checked")) {
                    if (!LaserCloud.initiated) {
                        Measure.init();
                        LaserCloud.init(gfxEngine.getZero()); //Init itself and its shaders
                        gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                        LaserCloud.launchLaserAroundCurrentTime(10, 11);
                    }
                    else {
                        if (LaserCloud.getNotLoaded())
                            LaserCloud.launchLaserAroundCurrentTime(10, 11);
                    }
                    $("#checkbox1").prop("checked", true);
                    LaserCloud.setVisibility(true);
                }
                LaserCloud.btnSwitchLine = !LaserCloud.btnSwitchLine;

                if (LaserCloud.btnSwitchPoint || LaserCloud.btnSwitchVolume) {
                    LaserCloud.btnSwitchPoint = false;
                    LaserCloud.btnSwitchVolume = false;
                }
            }

            function laserVolumeMeasure(e) {
                //loading laser points!
                if (!$("#checkbox1").prop("checked")) {
                    if (!LaserCloud.initiated) {
                        Measure.init();
                        LaserCloud.init(gfxEngine.getZero()); //Init itself and its shaders
                        gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                        LaserCloud.launchLaserAroundCurrentTime(10, 11);
                    }
                    else {
                        if (LaserCloud.getNotLoaded())
                            LaserCloud.launchLaserAroundCurrentTime(10, 11);
                    }
                    $("#checkbox1").prop("checked", true);
                    LaserCloud.setVisibility(true);
                }
                LaserCloud.btnSwitchVolume = !LaserCloud.btnSwitchVolume;
                if (LaserCloud.btnSwitchPoint || LaserCloud.btnSwitchLine) {
                    LaserCloud.btnSwitchPoint = false;
                    LaserCloud.btnSwitchLine = false;
                }
            }

            function checkboxChangeFilterSurface(e){

                  LaserCloud.setFilterSurface($("#chbxFilterSurface").prop("checked"));
            }

           
            
            function exportClassification(e){

                if(LaserCloud.initiated)
                    LaserCloud.exportClassificationToFile();
            }

            function laserMeasureClearAll(e) {
                Draw.removeAllMeasures();
                Draw.removePtsNeibords();
                gfxEngine.removeTextPanels();
                Cartography.removeAllFeature(Cartography.getLaserLayer());
                Events.setPointLineMesure(null, null);
                $("#chbxSnappON").prop("checked", false);
                $("#chbxComputeNormal").prop("checked", false);
            }

            function showCasqyPoints(e) {
                if ($(this).prop("checked")) {
                    Import.loadCasqyPointIntoScene();
                } else
                {
                    Import.setVisibleAllPoints(false);
                }
            }

            function showCasqyLines(e) {
                if ($(this).prop("checked")) {
                    Import.loadCasqyPoly();
                } else {
                    Import.setVisibilityLines(false);
                }
            }

            function showCasqyGeoPortail(e) {
                if ($(this).prop("checked")) {
                    Import.loadCasqyPointGeoPortail();
                    Import.loadCasqyLineGeoportail();
                } else {
                    Import.removeAllFeature();
                }
            }


            function previousPOI(e){

               
                    Measure.goToPOI('prev');
            }

            function nextPOI(e){

              
                    Measure.goToPOI('next');
            }

            function checkboxAnnotationChange(e){

                if (!LaserCloud.initiated) {
                        Measure.init();
                        LaserCloud.init(gfxEngine.getZero()); //Init itself and its shaders
                        gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                        LaserCloud.launchLaserAroundCurrentTime(10, 11);
               }

               $("#checkbox1").prop("checked", true);
               LaserCloud.setVisibility(true);
             /*
               // Point mesure activated if not
               if(!$("#btnPoint").prop("checked")) {
                    //$("#btnPoint").prop("checked", true);
                    $("#btnPoint").val() == "true"
                    LaserCloud.btnSwitchPoint = !LaserCloud.btnSwitchPoint;

                     if (LaserCloud.btnSwitchLine || LaserCloud.btnSwitchVolume) {
                         LaserCloud.btnSwitchLine = false;
                         LaserCloud.btnSwitchVolume = false;
                     }
                }
                */
               LaserCloud.setAnnotationOnOff($(this).prop("checked"));
            }



             function ViewModeOff() {
             	gfxEngine.setSpeedTransCam(0.04);
                gfxEngine.setSpeedTurnCam(0.1);

                $("#btnViewIti").remove();
             }


            // end of adding new functions

            function modelEntryClicked(e) {

                if ($(this).hasClass("selected") === false)
                {
                    $(this).siblings(".selected").removeClass("selected");
                    $(this).addClass("selected");
                    ModelManager.selectModel(parseInt($(this).attr('id')), _currentTransform);
                    if (_currentTransform.length > 0 && _transformButtons[_currentTransform].hasClass("control-button--active") !== true) {
                        _transformButtons[_currentTransform].addClass("control-button--active");
                    }

                    for (var transform in _transformButtons) {
                        _transformButtons[transform].removeAttr("disabled");
                    }

                }
                else {
                    $(this).removeClass("selected");
                    ModelManager.unselectModel(parseInt($(this).attr('id')));
                    for (var transform in _transformButtons) {
                        if (_transformButtons[transform].hasClass("control-button--active")) {
                            _transformButtons[transform].removeClass("control-button--active");
                        }
                        _transformButtons[transform].attr("disabled", "true");
                    }
                }
            }

            function addModel(model) {

                if (ModelManager.modelCount() > 0) {
                    _$modelList.find(".selected").removeClass("selected");
                    _$modelList.append("<li class=\"selected\" id=" + model.id + ">" + model.name + "<span title=\"Supprimer\" class=\"deleteModel\">x</span></li>");
                    var $lastLi = _$modelList.find("li").last();
                    $lastLi.click(modelEntryClicked);
                    $lastLi.find("span").click(btDeleteModelClicked);
                }
                else {
                    _$emptyElem.remove();
                    _$modelList.append("<li class=\"selected\" id=" + model.id + ">" + model.name + "<span title=\"Supprimer\" class=\"deleteModel\">x</span></li>");
                    _$modelList.find("li").click(modelEntryClicked);
                    _$modelList.find("li").find("span").click(btDeleteModelClicked);
                }

                for (var transform in _transformButtons) {
                    _transformButtons[transform].removeAttr("disabled");
                }
            }

            function loadUserModels() {

                //lance le chargement (assynchrone) des modèles stockés en BD
                ModelManager.loadUserModelsFromDB(function(){
                    var models = ModelManager.getUpdateModelList();
                    var ids = Object.keys(models);
                    if (ids.length > 0) {
                        _$emptyElem.remove();

                        ids.forEach(function(id) {
                            _$modelList.append("<li id=" + id + ">" + models[id].name + "<span title=\"Supprimer\" class=\"deleteModel\">x</span></li>");
                        });

                        _$modelList.find("li").click(modelEntryClicked);
                        _$modelList.find("li").find("span").click(btDeleteModelClicked);

                        for (var transform in _transformButtons) {
                            _transformButtons[transform].removeAttr("disabled");
                        }

                    }
                });
            }

            function analyzeInterim(s) {

                console.log(s);

                if (s.indexOf('laser') !== -1) {

                    if (s.indexOf('affiche') !== -1) {

                        if (!LaserCloud.initiated) {
                            Measure.init();

                            LaserCloud.init(gfxEngine.getZero()); //Init itself and its shaders
                            gfxEngine.addToScene(LaserCloud.laserCloudMaster);
                            LaserCloud.launchLaserAroundCurrentTime(10, 11);
                        }
                        else {
                            if (LaserCloud.getNotLoaded())
                                LaserCloud.launchLaserAroundCurrentTime(10, 11);
                            LaserCloud.setVisibility(true);
                        }
                    }
                    else if (s.indexOf('efface') !== -1) {
                        if (LaserCloud.initiated)
                            LaserCloud.setVisibility(false);
                    }


                } else
                if (s.indexOf('M') !== -1) {

                    if (s.indexOf('affiche') !== -1) {

                        MeshManager.setShowDTM(true);
                    }
                    if (s.indexOf('efface') !== -1) {
                        MeshManager.setShowDTM(false);
                    }

                } else
                if (s.indexOf('mont') !== -1) {

                    gfxEngine.getTranslatCam().y += 40;
                }
                if (s.indexOf('descen') !== -1) {

                    gfxEngine.getTranslatCam().y -= 40;
                }

            }


             function checkboxZebra(e){
                 Draw.setZebraOn($(this).prop("checked"));
             }


            function checkboxEffectsChange(e) {

                   gfxEngine.setPostProcessingOn($(this).prop("checked"));
            }

            function checkboxEffectsClimate(e){

                 WeatherEffects.setEffectsClimateOn($(this).prop("checked"));

                 if($(this).prop("checked")){
                    MeshManager.generateSkyBox();
                }
                else {
                    MeshManager.removeSkyBox();
                }
            }

            function checkboxSharpen(e){
                console.log('shaaarp');

                 if($(this).prop("checked")){
                    gfxEngine.addPostProcess();
                }
                else{
                    // We delete map and effects
                    gfxEngine.removePostProcess();
                }
            }

            function checkboxToneMapping(e){
                console.log('tonemapping');
                 
                 if($(this).prop("checked")){
                    gfxEngine.addToneMapping();
                    
                }
                else{
                    // We delete map and effects
                    gfxEngine.removeToneMapping();
                }
            }
            
            
            function checkboxEffects3DGlasses(e){
                gfxEngine.setAnaglyphOnOff();
            }

            function switch3DGlasses(e){
                gfxEngine.switch3DGlasses();
            }

            // find itinerary between point A & point B
            function searchAB(e) {
            	Itinerary.cleanIti();
            	Itinerary.removeItinerary3D();
            	var A = $("#searchA").val();
            	var B = $("#searchB").val();

            	var posA, posB;

            	if (A && B) {
            		var urlA = Cartography.buildOLSRequest(A, false);
            		var urlB = Cartography.buildOLSRequest(B, false);

	    			console.log("Searching...");

	    			searchPointOnGeoportail(urlA, function(pos) {
	        			posA = pos;
	        		});
	        		searchPointOnGeoportail(urlB, function(pos) {
	        			posB = pos;
	        		});

	        		var dtd = $.Deferred();
	        		var wait = function(dtd) {
	        			if (!posA && !posB) {
		        			setTimeout(function() {
		        			console.log("Wait for positions...");
		        			wait(dtd);
		        			}, 500);
		        		} else {
		        			console.log("done");
		        			dtd.resolve();
		        		}

		        		return dtd;
	        		};

	        		// positions found - search iti
	        		$.when(wait(dtd))
	        		.done(function() {
	        			// clean the map
	        			console.log(posA);
	        			console.log(posB);
	        			Cartography.removeAllFeature(Cartography.getItineraryLayer());
	        			Itinerary.searchItinerary(posA, posB);
	        		});


            		//Cartography.sendOLSRequest(A, false);
            		//Cartography.sendOLSRequest(B, false);


            	} else {
            		throw new Error("Entrez A & B svp");
            	}
            }

            function searchPointOnGeoportail(url, callback) {
            	var position;

	            $.getJSON("http://wxs.ign.fr/" + Config.geoAPIKey + "/geoportail/ols?xls=" + url + "&output=json&callback=?")
                .done(function(data) {
                    var format = new OpenLayers.Format.XLS();
                    var output = format.read(data.xml);

                    if (output.getNbBodies() > 0) { //the OLS service returns something
                        var firstGeocodeResponse = output.getBodies()[0].getResponseParameters().getGeocodeResponseList()[0];
                        if (firstGeocodeResponse.getNbGeocodedAddresses() > 0) { //at least one location has been found
                            position = firstGeocodeResponse.getGeocodedAddresses()[0].lonlat;
                            callback(position);
                        }
                    }
                });
            }

            function loadPointInfo(pt) {
            	return 'php/getInfoFromName.php?panoname=' + pt;
            }

            // TODO: hardcoded, should have a nice solution
            function resizeInnerPanel() {

                var allPanel = $(".panel-inner");
                console.log(allPanel);
     			allPanel.each(function(index) {
     				if (index === 5) {
     					$( this ).height(330);
     				}
     			});
            }



            // ---------------------------------------------------------------------------------------------------------------------------/

            //END OF PRIVATE MEMBERS***********************************************************************************
            //*********************************************************************************************************

            /**
             * Manages the basic GUI based on google art dat.gui project
             * @author Mathieu Benard IGN - Vincent De Oliveira ENSG
             * @class Manages the graphic user interface.
             */
            var GUI = {
                init: function() {

                    initDOMElements();
                    //initXMLClassif();


                    $("#text1").keyup(textInputChange);
                    $("#recherche1").click(search);
                    $("#recherche2").click(search);
                    $("#ckbGeonamesLayer").change(ckbGeonamesLayerChange);
                    $("#checkbox1").change(checkbox2LaserLayerChange);
                    $("#checkbox2").change(checkbox2PanoramicLayerChange);
                    $("#checkbox3").change(checkbox3OrthophotoLayerChange);
                    $("#checkbox4").change(checkbox4MNTLayerChange);
                    $("#checkboxAnnotations").change(checkboxAnnotationChange);
                    $("#checkboxGeoveloPOI").change(checkboxGeoveloPOIChange);
                    $("#checkboxEffects").change(checkboxEffectsChange);
                    $("#checkboxClimate").change(checkboxEffectsClimate);
                    $("#checkboxSharpen").change(checkboxSharpen);
                    $("#checkboxToneMapping").change(checkboxToneMapping);
                    $("#checkbox3DGlasses").change(checkboxEffects3DGlasses);

                    $("#chbxCarto3D").change(showBati3D);
                    $("#upButton").click(upClicked);
                    $("#reportButton").click(reportClicked);

                    $("#ckbCasqyPoints").change(showCasqyPoints);
                    $("#ckbCasqyLines").change(showCasqyLines);
                    $("#ckbCasqyGeoPortail").change(showCasqyGeoPortail);

                    $("#chbxComputeNormal").change(computeNormal);
                    $("#chbxZebra").change(checkboxZebra);

                    $("#btnPrevious").click(previousPOI);
                    $("#btnNext").click(nextPOI);

                    $("#btnPreviousGeo").click(previousPOI);
                    $("#btnNextGeo").click(nextPOI);
                    $("#btnGenerateItinerary").click(generateItinerary);

                    $("#btnPoint").click(laserPointMeasure);
                    $("#btnLine").click(laserLineMeasure);
                    $("#btnVolume").click(laserVolumeMeasure);
                    $("#chbxFilterSurface").change(checkboxChangeFilterSurface);
                    $("#btnClean").click(laserMeasureClearAll);
                    $("#btnSave").click(saveLaserMesureAsKML);
                    $("#btnSaveSHP").click(saveLaserMesureAsSHP);

                    $("#switch3DGlasses").click(switch3DGlasses);

                    // new elements
                    // edit dropped object
                    $("#checkboxEditDroppedObject").change(checkboxEditDroppedObjectChange);
                    $("#btnCreateItinerary").click(createItinerary);
                    $("#btnSaveItinerary").click(saveItinerary);
                    // view point
                    $("#btnLoadItinerary").click(loadItineraryClicked);
                    $("#btnAddViewPoint").click(addViewPointClicked);
                    $("#captureView").click(captureViewClicked);
                    $("#btnSaveViewPoint").click(saveViewPointClicked);
                    $("#viewPointPrevious").click(onNavBtnClicked);
                    $("#viewPointNext").click(onNavBtnClicked);

                    // new menu
                    $("#listIti").ready(loadItineraryClicked);
                    $("#viewIti").click(ViewModeOn);
                    $("#searchAB").click(searchAB);

                    // As slide is already defined for both sliders
                    // We modify it adding the laser specific functions...
                    var optionsSize = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            LaserCloud.setPointSize(ui.value / 10);
                        }
                    };
                    $("#range1").slider(optionsSize); //click(laserChangeSize);

                    var optionsOpacityLaser = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            LaserCloud.changeAlpha(ui.value / 100);
                        }
                    };
                    var optionsOpacityOrtho = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            MeshManager.setMapOpacity(ui.value / 100);
                        }
                    };
                    var optionsSaturation = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            gfxEngine.setSaturationValue(ui.value);
                        }
                    };
                    var optionsHue = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            gfxEngine.setHueValue(ui.value);
                        }
                    };
                    var optionsContrast = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            gfxEngine.setContrastValue(ui.value);
                        }
                    };
                    var optionsBrightness = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            gfxEngine.setBrightnessValue(ui.value);
                        }
                    };
                     var optionsBase3D = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            gfxEngine.setBase3DGlasses(ui.value);
                        }
                    };
                    var optionsRangeClimate = {
                        slide: function(e, ui) {
                            var label = this.parentNode.querySelector('label');
                            label.querySelector('span').innerHTML = ui.value;
                            WeatherEffects.setClimate(ui.value);
                        }
                    };
                    $("#range2").slider(optionsOpacityLaser);
                    $("#range3").slider(optionsOpacityOrtho);
                    $("#rangeSaturation").slider(optionsSaturation);
                    $("#rangeHue").slider(optionsHue);
                    $("#rangeContrast").slider(optionsContrast);
                    $("#rangeBrightness").slider(optionsBrightness);
                    $("#rangeBase3D").slider(optionsBase3D);
                    $("#rangeClimate").slider(optionsRangeClimate);
                    $("#container").focus();

                    loadUserModels();

                },
                loadModel: function(file) {

                    var collada = new FormData();
                    collada.append('collada', file);
                    var $jqXHR = $.ajax("php/postCollada.php", {
                        type: 'POST',
                        data: collada,
                        processData: false,
                        contentType: false
                    });

                    $jqXHR.done(function(data) {
                        var result = JSON.parse(data);
                        if (result.status === "success") {

                            _currentTransform = _currentTransform.length === 0 ? "translate" : _currentTransform;

                            if (_transformButtons[_currentTransform].hasClass("control-button--active") !== true) {
                                _transformButtons[_currentTransform].addClass("control-button--active");
                            }

                            ModelManager.loadCollada(result.url, addModel, _currentTransform);
                        }
                        else {
                            console.log(result.message);
                        }
                    });


                },

                initVoiceReco: function() {

                    console.log('voice Recognition activated');
                    var recognition = new webkitSpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = "fr-FR";
                    //   var final_transcript ='';

                    recognition.onresult = function(event) {

                        var interim_transcript = '';

                        // Assemble the transcript from the array of results
                        for (var i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                //    final_transcript += event.results[i][0].transcript;
                            } else {
                                interim_transcript += event.results[i][0].transcript;
                            }
                        }
                        //   console.log(interim_transcript);
                        if (interim_transcript != lastOrder) {
                            lastOrder = interim_transcript
                            analyzeInterim(lastOrder);
                        }

                        //  console.log("interim:  " + interim_transcript);
                        //     console.log("final:    " + final_transcript);

                    };

                    recognition.start();

                },

                getCurrentClassEditing: function(){

                    var idClass = _tabClassif[document.getElementById('choice_class').value];
                    if(idClass ==undefined) idClass = 0;
                    return idClass;
                },

                getIdFromFR: function(fr){
                    return _tabClassif[fr];
                },

                getCarousel3D: function() {
                	return carousel3D;
                },

                getIti: function() {
                	return _iti;
                },

                setGeoIti: function() {
                	getGeoIti();
                },

                addPOI: function(x, y) {
                	//Geovelo.setViewPointOn(true);
            		//var indice = Geovelo.addIndice();

            		var mB = MeshManager.getCurrentObject();  // Get rge mesh or at least a road plane
                    _intersects = gfxEngine.getIntersected(x, y, [mB]);//gfxEngine.getScene().children);
                    if(_intersects[0]){
                        _mouse3D = new THREE.Vector3(_intersects[0].point.x,_intersects[0].point.y,_intersects[0].point.z);   // y+0.05 to put over mesh RGE to see clean
                        //console.log('addPoi geovelo',_mouse3D);
                        
                    }

                },

                setPts93: function(pts) {
                	_pts93 = pts;
                },

                getPts93: function() {
                	return _pts93;
                },

                setViewModeOn: function(v) {
                	_viewMode = v;
                }

            };
            return GUI;
        });
