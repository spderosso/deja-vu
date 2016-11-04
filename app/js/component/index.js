/**
 * Created by Shinjini on 9/26/2016.
 */

var zoomElement = ZoomElement();
var miniNav = MiniNav();
var view = ComponentView();
$(function(){
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


    resizeViewportToFitWindow();



    Parse.initialize("8jPwCfzXBGpPR2WVW935pey0C66bWtjMLRZPIQc8", "zgB9cjo7JifswwYBTtSvU1MSJCMVZMwEZI3Etw4d");

    // get selected project
    selectedProject = window.sessionStorage.getItem('selectedProject');
    if (selectedProject){ // if it exists, load it
        selectedProject = UserProject.fromString(selectedProject);
    } else { // if not, make a new one
        selectedProject = new UserProject(DEFAULT_PROJECT_NAME, generateId(), DEFAULT_VERSION, DEFAULT_AUTHOR);
    }

    $('.project-name .header').text(selectedProject.meta.name);

    addedCliches = selectedProject.addedCliches;
    for (var id in addedCliches) {
        showClicheInList(id, addedCliches[id].name);
    }

    if (selectedProject.numComponents == 0){
        // start a default component
        selectedUserComponent = initUserComponent(true, true);
        selectedProject.addMainPage(selectedUserComponent);

        workSurface.loadUserComponent(selectedUserComponent, currentZoom);
        displayMainPageInListAndSelect(selectedUserComponent.meta.name, selectedUserComponent.meta.id);
    } else {
        if (!$.isEmptyObject(selectedProject.mainComponents)){
            var componentToLoadId = Object.keys(selectedProject.mainComponents)[0];
        } else {
            var componentToLoadId = Object.keys(selectedProject.components)[0];
        }
        selectedUserComponent = selectedProject.components[componentToLoadId];
        if (componentToLoadId in selectedProject.mainComponents){
            displayMainPageInListAndSelect(selectedUserComponent.meta.name, componentToLoadId);
        } else {
            displayUserComponentInListAndSelect(selectedUserComponent.meta.name, componentToLoadId);
        }
        for (var componentId in selectedProject.components){
            if (componentId != componentToLoadId){
                var componentName = selectedProject.components[componentId].meta.name;
                if (componentId in selectedProject.mainComponents){
                    displayNewComponentInMainPagesList(componentName, componentId)
                } else {
                    displayNewComponentInUserComponentList(componentName, componentId);
                }

            }
        }
        window.setTimeout(function(){
            workSurface.loadUserComponent(selectedUserComponent, currentZoom);
        }, 1);

    }


    //autoSave5Mins();

    basicComponents = $('#basic-components').html();

    registerDraggable();

    zoom.registerZoom();
    miniNav.miniNavInitialize();

    registerUserComponentAreaDroppable();

    setUpStyleColors();


    // finish load animation
    $('.loader-container').fadeOut("fast");


});