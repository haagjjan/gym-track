# List of upracticalities in the complete app

> Implementation note (2026-07-15): this audit supersedes audit v2 wherever the two conflict. The Progress requirement is implemented as one strongest working set per user-local calendar day, including days with multiple workout sessions. The exercise selector count uses those same unique plotted days.

I will wirte down per Area and subarea, which topics stand out as unpractical, and how thy are to be adjusted.

## Dashboard
- This is good for now, works as expected

## History

### History tab in History:
1. the " + new session" button should be but next to the title: workout history (button on the same height as the title), so the position of the button "+ new session" buttons "+ new template" an "+ new exercise" is the same in all 3 tabs.

### Templates tab in History:
1. in the edit template menue, the up an down arrows should be taken away. 

### Exercises tab in Hisstory: Important to decide future way
- THis is good for now, works as expected

#### When creating an Exercise / editing an exercise
- when you click on save exercise, then its correct that the user gets asked again if he really wants, however currently this is in a seperate box above the save exercise and cancle button. However i think its better, that a pop up message in the same style as the "delete this workout log" message from deleting a workout log gets shown.

## Progress
- The select lift box currently has the select lift text not centered in the height of the box, it should have equal distance to the top as to the bottom of the box of this widget. 
- In the working set signal graph, there shouldnt be days where multiple sets get logged, even if there are multiple workouts logged that day. only the strongest set per workout per day should be taken for the plot.
- when the exercises get shown, in the select lif box, the exercises show eg 50 sets, however these are just th total sets done over all, but i think it better, if only the sets get countet, that are also indvidually counted into the ploted sets (so when in one session 10 sets were done, then this shouldnt count as 10 sets, but only as 1, as only 1 was counted in the graph)

## Volume (for Mobile view)
1. the distribution matrix widget: the bars shouldnt just display the color, but especially also display the amount of sets done proportionally, menaing: even if shoulders have 1 set, and biceps 2, then the bars should be the same color, but still different size or distanze.
2. the workout set heat map widget: when hovering over one of the colored bars, then the amount of set range thats required for this one should be shown. eg: 0-2 sets / WK , or 50+ sets / WK

## Live Session
1. When cklicking on add exercise, the new screen shows up, now the user should be able to select multiple exercises, by clicking on the plus to select, and then afterwards click on add selected exercises, (this button should be above the current create new exercise button, with the equal size)
2. the live execise screen should heave 2 modes: Exercises mode, Set mode.
    - Exercise Mode: The currently selected set gets compacted, and only the exercises are expanded. this is the default mode, then when clicking on exercise, this exercise gets opend in the set mode
    - Set mode: the exercises are collapsed, and this one exercise is all the sets done shown, also now that we do it like this, the two up and donwn arrows, should move to the next exercise or the previous exercise

## System settings 
- good for now.
