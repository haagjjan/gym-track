# List of upracticalities in the complete app

> Status: this audit is the V1 gym-use source of truth. It supersedes conflicting behavior in the earlier Stitch redesign notes and roadmap. The remediation is implemented in responsive web scope; native mobile remains out of scope.
I will wirte down per Area and subarea, which topics stand out as unpractical, and how thy are to be adjusted.

## Dashboard

1. There are 3 different buttons to start a session in the mobile version. In the mobile version there is: 1. Start_session, 2. Start session as a stand alone, in the previous session widget, and 3. initiate session, from the latest logs widget
    This should be changed, so that there is only one button. the Start session button directly underneeth the figure.
2. There are also multiple start session buttons in the Dashbord of the deskotp version. also make only one prominent. I think the initiate session is good there. 

## History
1. The history tab is called history tab, jet it contains 3 sub tabs: History, Templates, Exercises. 
    This tab should be renamed to: Workouts, where the 3 subtabs are: Workout History, Workout Templates, Exercise List

### History tab in History:
1. The deletion of a exercise creates an error: It asks correctly: destructive action: delete this workout? to confirm, but after clickin delete log, it just does nothing, so the user has the feeling nothing gets deleted, the button is reactive, but the desturctive action message stays up. Somehow only when refreshing the page the session gets deleated.
    This needs to be fixed, so that the deletion is clearer for the user.
2. in the history screen the search function currently is above the 3 tabs History, templates, exercise. this is good for desktop, but needs to be below for the mobile versin. That way: the different taby are at the very top in the mobile, and beneeth is the search for the history tab.
3. The search in the history button needs adjustemnt: Currently when searching for eg may 09 the results only pop up, iff the result is currently also displayed. meaning: iff only the first 20 results are displayed then only form these first results the search gets looked up.
4. The Tonnage display and the avg duration also only shows the total lifted weight of the currently displayed workouts. 
    The Tonnage should be the total over all workouts
    the avg duration should be the avg over all workouts.
5. The History tab should also have a filter option, It would make sense that therer would be the following filtering options: (this should be the new standart fo all the different search, sort and filter options.)
    - sort by last done, with biger marked timestamps as sort of sub cateogries, per month, eg july, and then beneeth all logs of july.
    - Search, by exercise or muscle, or equipment
    - Muscle: Select all the muscles to filter from, enable multiple muscle groups to be selectable, and then only show the exercises that have both.
    - Type: Select the exercise type, eg: compound, isolation ect
    - ALso if mutiple filters are chosen, then only the results are returned, that have all incomon
    - Besides sorting by A-Z, by Muscle, it should also be sortable by: Equipment, and by Type
6. Besides the title of the page, there should also be a button: + new Session, just like the buttons + new Exercises, and + new template

### Templates tab in History:
1. The manage Button should be renamed to Edit.
2. Similar to the History tab, the Templates tab should also have a search function. to search for certain templates.
3. The templates tab should also have a filter option, It would make sense that therer would be the following filtering options: (this should be the new standart fo all the different search, sort and filter options.)
    - Filter by last done / last used as workout - here a workout counts to a template, if it has the same exercises listed in the workout log as the template. this means a workout gets automatically counted towards a template, even if the template wasnt used as a basis for the workout. The order of the exercises should also not matter.
    - Search, by exercise or muscle, or equipment
    - Muscle: Select all the muscles to filter from, enable multiple muscle groups to be selectable, and then only show the exercises that have both.
    - Equipment: Select the equipment to filter from, here it should also be as a drop down, not search
    - Type: Select the exercise type, eg: compound, isolation ect
    - ALso if mutiple filters are chosen, then only the results are returned, that have all incomon
    - Besides sorting by A-Z, by Muscle, it should also be sortable by: Equipment, and by Type
4. when discarding changes to workout templates, the discard message is a native message of the browser, and not one of the web app, in the web app style.

### Exercises tab in Hisstory: Important to decide future way
1. The Read only and Edit versions is okay, but this should be marked. I persume Read only is when a exercise is a standart exercise created by other users, or exist per default. 
    This means when a user hovers with the mouse over the read only, or trys to click on read only, then a small message should pop up, with: exercise is a system exercise, you can only edit personally created exercises
2. Exercise filtering currently only lets the user choose one muscle group as a filter.
    It would make sense that therer would be the following filtering options:
    - Search, by exercise or muscle, or equipment
    - Muscle: Select all the muscles to filter from, enable multiple muscle groups to be selectable, and then only show the exercises that have both.
    - Equipment: Select the equipment to filter from, here it should also be as a drop down, not search
    - Type: Select the exercise type, eg: compound, isolation ect
    - ALso if mutiple filters are chosen, then only the results are returned, that have all incomon
    - Besides sorting by A-Z, by Muscle, it should also be sortable by: Equipment, and by Type

#### When creating an Exercise 
1. When entering the name, similar names of other exercises should appear to choose form, as a atutomatic similarity search.
2. Equipment: Here the user should not have the ability to enter anything. the user shuold only be able to pick from certain equipments predefined, or select other or nothing or body weight whatever you deem as fit.
3. the same thing goes for Type.
4. primary muscel groups, and secundary mucle gorups should be hidden under dropdown wehn starting with creation, one primary muscle group should be required. 

## Progress
1. When a exercise was done over a period of multiple years, the year is also displayed in the x Axis, this causes a visual bug, where the date isnt completely visible.
    To fix this, just hard code it so that the year is never shown, also not when its over the year break. this isnt an issue, bc the year break is marked with a thick line in the graph itself.
2. Under Recent Set logs, there should only be the sets listed that are actually relevant for the graph, so only the sets that are taken as the best set per workout / session. bc the graph is also only mad up of the best sets per workout day.
3. The Info for the Est 1RM, should be a half its current diameter, and at the top right of the est 1RM, also the text that appears should be more readable. Currently it also displays a formula, however the formula is in the same writing style as the text, which makes it unreadabel. so the formula is good, but it needs to be displayed on one single line, and with correct mathematical formula wriging style.
4. When you change something of: Date diplayed, Load reps / est 1RM, Weight/reps, then this should stay selected even if the user selects a other exercise to display.

## Volume (for Mobile view)
1. When taping on the volume menue, then: (either abs will always be selected, or the first exercise alphabetically seems to be always be selected.) change this so that, no exercise is selected per standart when clicking on the menue volume.
    the standart direction the figure faces, when cklickin on the menue Volume, should be front.
2. the Widgets: window set active muscles, latest week, heat ceiling, shuold not appear above the figure. but below the working set heat map widget.
3. the widget Heat cieling is irrelevant, and can be discarded. 
4. the windget window sets, can be discarded as well, instead of a sepearate widget, well just add one always shown line of Total, below all the distribution matrix, with the total sets done
5. the 1w, 1m 3m, can also be shown i the screen, in toe top right of the 3d figure screen. and the front back butons can be moved to the top left of the 3d screen
6. Currently there is a clean continous change of the color of the muscle groups. This should be changed to a 5 stage color map, where we start form verry bright purple, and go further until deep purple, in 5 steps, therefore the working set heat map, also needs adjustment to depict this. 
7. cieling for the heat cieling should be changable in the settings, so that a user can set his highes heat cieling setting to whatever he likes in the range of 5 - 50. and the steps should be proportionally adjusted to the max heat cieling.

## Live Session
1. When cklickin on start a session, or whatever button to start a new session, then the user should first be confronted with 2 options: Start session from scratch, Use Workout template. 
2. the second direct thing thats required of the user is: enter Session Name, this is either empty if the user has chosen from scratch, or already paritally filled in, with the name of the template. then when the user cklick sout of the box the session name should automatically be accepted, so the additional clicking on the accept arrow is unnecessary.
3. the + add button, should be named: + add exercise, or + exercise, or add exercise, whatever fits best 
4. The discard workout button currently is quite aqwardly palced.
5. when adding a new exercis to the session, then tis one should also automatically be the currently selected exercise, so no adding an exercise, and then still having the last one selected.
6. Currently you have to click exactly on hold to drag and drop the exercise order, but this should not be the case: The hold should not be marked
7. The complete screen needs some rework:
    - All the chosen exercises for the session, should be shown in a List format, not in one row as a side scroll. In the mobile format the exercises should fill the screen for L to R, and instead of a hold, there should be the same thing that apple uses, to make the hod to drag and drop thing. Per default only 4 exercises should be shown of the list. like in a scroll for a timer, or time selection. the currently active exercise should be marked as the cyan. the chosen exercises should all be thiner then currently
    - the Station test above the exercise can be discarded. this is unnecessary.
    - The up and down arrows are also unnecesary
    - The Set displays are good
    - beneath the sets there should always be a button, add set
    - The logging widget wher you enter working, warmum, note , weight, reps, rir, ect, should only be visible if you click on the add set button belo the last set of the exercise.
    - The rest protocol widget should appear at the butoon of the screen.
    - Currently when tying to edit a set, the edit set screen apends beneath the current logging widget, thats always on display. this ofcause makes no sense. the eintiere screen nees scorlling as well, and cant have a overlay of screens or widgets.
    - when trying to edit a previous set, and you already started loging a new set, and havent jet saved it, it will be presaved as a uncomplete edit set and automatically closed

    ## System settings 
    1. I think they are a bit out of order, or just unorganized as of jet
    2. the exercise maintainance is an important issue to tackel, though i dont know jet how exactly. I think its just important to have the option to add a existing wrongly named / wrongly created exercise, and merge all these exercises to a already existing exercise. 
