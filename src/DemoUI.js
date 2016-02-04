
function laserPointMeasureEnable(e) {
    //loading laser points!
    if (!$("#checkboxLaserCloud").prop("checked")) {
        itowns.addLayer("pointCloud",itowns.dataURL);
        //LaserCloud.setVisibility(true);
    } else {
        itowns.removeLayer("pointCloud");
    }
    /*
    LaserCloud.btnSwitchPoint = !LaserCloud.btnSwitchPoint;

    if (LaserCloud.btnSwitchLine || LaserCloud.btnSwitchVolume) {
        LaserCloud.btnSwitchLine = false;
        LaserCloud.btnSwitchVolume = false;
    }
    */
}


function streetViewEnable(e) {
    
}