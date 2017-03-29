/**
 * Created by Shinjini on 9/26/2016.
 */
var isOverall = true;
var dataZoomElement = DataZoomElement();
var dataMiniNav = DataMiniNav();
var dataWorkSurface = DataWorkSurface();
var dataDragAndDrop = DataDragAndDropController();
var canvas = Canvas();
var utils = Utility();

var selectedScreenSizeHeight = 1600;
var selectedScreenSizeWidth = 2000;

var files = [];

var selectedUserWidget = null;
var selectedCliche = null;
var userApp = null;
var selectedProject = null;


var currentZoom = 1.0;
var basicWidgets;


// settings
var confirmOnUserWidgetDelete = true;

$(function(){
    canvas.createCanvas($('#outer-container'), selectedScreenSizeHeight, selectedScreenSizeWidth);
    $('.project-options-container').css({
        height: ($('html').height() - 70) + 'px',
    });

    $('#outer-container').css({
        height: ($('html').height() - 70 - 44) + 'px',
    });

    // todo get screenSizes for the user

    $('#selected-screen-size').css({
        height: selectedScreenSizeHeight*currentZoom + 'px',
        width: selectedScreenSizeWidth*currentZoom + 'px',
    });

    dataMiniNav.miniNavInitialize();

    // get selected project
    selectedProject = window.sessionStorage.getItem('selectedProject');
    if (selectedProject){ // if it exists, load it
        selectedProject = UserProject.fromString(selectedProject);
    } else { // if not, make a new one
        selectedProject = new UserProject(DEFAULT_PROJECT_NAME, utils.generateId(), DEFAULT_VERSION, DEFAULT_AUTHOR);
    }

    $('.project-name .header').text(selectedProject.meta.name);


    if (!selectedProject.userApp){
        // start a default component
        userApp = initUserApp();
        selectedProject.addCliche(userApp);
        selectedProject.makeUserApp(userApp);
    } else {
        var userAppId = selectedProject.userApp;
        userApp = selectedProject.cliches[userAppId];

        // TODO this will need to be changed once we bring in a userComponent which will be a
        // superset of userWidgets
        var appName = userApp.meta.name;
        displayNewClicheInList(userApp);
        displayOverallDatatypesInListAndSelect(appName, userAppId);

        for (var datatypeId in userApp.datatypes){
            var datatypeName = userApp.datatypes[datatypeId].meta.name;
            displayNewDatatypeInUserDatatypeList(datatypeName, datatypeId, userAppId);
        }
    }

    dataWorkSurface.loadCliche(userApp, currentZoom, isOverall);
    //autoSave5Mins();

    basicWidgets = $('#basic-components').html();

    dataDragAndDrop.registerDataDragHandleDraggable();

    dataZoomElement.registerZoom(userApp);

    resizeViewportToFitWindow();

    // finish load animation
    $('.loader-container').fadeOut("fast");


});