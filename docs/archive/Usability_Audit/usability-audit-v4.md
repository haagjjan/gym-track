# List of upracticalities in the complete app

> Implementation note (2026-07-16): this audit is the latest V1 beta UI source of truth and supersedes audit v3, audit v2, and the older Stitch redesign wherever they conflict. The concrete adjustments below are implemented in responsive-web scope. The final “Features up for rework” list remains a post-beta backlog; this pass adds CSV format guidance but does not broaden import/export, naming, or history-reset scope.

I will wirte down per Area and subarea, which topics stand out as unpractical, and how thy are to be adjusted.

## Over All:
1. We went with 3 colors: Cyan, a purple tone, and a green tone. This is good for the color plate, however sometimes its not clear when a text is green, blue, and purple. This isnt a problem per se, but might need some rework, so that it feels natural for the user, when a text is white, cyan, green and purple.
2. The Add exercise functionality should allow the user to: 
    1. when clicking add exercise, open the current exercise catalog, (this works well for now). 
    2. Allow the user to filter and search for specific muscles, in the same manner, that it works in the Tab "exercise List" under the workouts menue. 
    3. Allow the user to select multiple exercises by clicking on the +. By clicking on the + the exercises arent automatically added to the workout, but just are marked with a cyan outline as selected.
    4. After haveing selected 1 or multiple exercises, the user should be able to cklick on add exercises. and by that the exercises get added to the current thing (eg the current session, the template, ect)
    There are by that 2 buttons called add exercises, this would need some renaming, evt. so its 1. open exercise list, 2. add exercises to session, or choos exercises, then add exercises


## Dashboard
This only needs minor readjustments. Currently all the widgets are good, and  all the informations are well placed.
Adjustments:
1. in the verry top text fields (the headers): The body cockpit-v2.0 is unnecessary, this can be replaced with the application name: Gym Progress Tracker, for now. 
2. the green online text in the top right can either be discarded (as i dont think this even works) or it can be reworked so it works
3. the system settings icon, is a bit missleading, currently its just a sun, this should be changed to a standart system settings icone
4. the System Ready // charge can be taken away form the 3d screen, as this is unnecessary informations. 

## Workouts
1. The filters in all the screens should be persistent. Meaning: if a user sets a filter or sorting, then this should be used, until he chooses to discard it, or set a newer filter. These informations can be stored locally for the user, so when a user closes the application completely, its fine if its reset.

### workout history
1. in the data portability: there should be a option to show how exactly the format of a imported csv must be to create the best import result.
2. The + in the new session button isnt the same as in the new template button, and in the new exercise button.

### workout templates:
Good as well. 
#### New Workout template / Edit workout template
1. Rework as listed in the overall point nr 2.
2. The format of the exercises that are shown, need some rework: 1. The replace button can be discarded. 2. the x should be placed next to the exercise title, or some where else. bc currently every exercise has the top row, thats actually fileld, and then the second row, thats only very partialli filled with the replace and the x.

### exercise list
1. The user should also have the option to filter the exercises by editable or not. i dont think this needs a altering of the datatype, as it should just filter if the creator of the exercise == the user_id (or something in this manner).
2. When editing a exercise, the primary muscles and secundary muscles screen should also start of by being collapsed, so in the same manner as in the create new exercise screen. 

## Progress
1. Change the Total sets widget slightliy: it should be adjustable; so if 3M are selected it would only depict the total sets over this time frame thats currently selected.
2. Change the avg_reps widget, to a total_tonnage widget, just like with the total sets but instead of sets counting the total weight. Here also its adjusted to the selected time frame.
3. The information text of the est_1RM is badly formated, it goes across the border.

## Volume (for Mobile view)
1. Make sure that scorlling isnt confusing in this screen for mobile users. I fear that with the 3d widget, a user who wants to scroll down, and palces his thumb on the 3d figure, just moves the figure instead or zoomes. EVT this is also something that doesnt even need fixing. 

## Live Session
1. the add multiple exercises work well. THe only thing that needs adjstment is: the filtering here like explained above, and the button add selected exercises should not have the + in the button. Also the 6 dots to move the exercises 
2. When clicking on add set, then the screen used for adding informations to a set should appear, this was done unil recently with a pop up screen, thats in the bottom of the screen. So make sure that when adding or altering a set the enter set datascreen is bounded to the verry bottom of the screen
3. the sets should be marked as working or warmup in the set list.
4. the timer should per default also be at the bottom of the screen,
5. the header of this screen has the text of the workout log name, and the "workout in progress" text strangely allighned with the other texts. I think the workout in progress is unnecessary. The check complete button should be renamed to: Finish. and to further signal a unsaved or incomplete workout, add a small timer below the Title, or below the finish button. Just small, live, grayed and slightly blinking in the second Rythm. 
6. its obvious to get from the Set mode to the exercises mode, but that you get back with cklicking on the the exercise isnt quite clear.
    Therefore:
    - Evt we need a small light weight animation, that goes from the exercises mode, to the set mode and back. 
    - also we would probably need a short instruction, like: "click on exercise to log sets" or make the title so that it always has a arrow forward ">" to show that its expendable.


## System settings 
good for now as well. 

## Features up for rework:
1. Data Import and Data export
2. Inteligent Naming conventions - Suggest names for correct writing
3. Deleat workout history, to completely clean the workout history form the profile
4. 
