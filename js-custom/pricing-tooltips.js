var helpbuttons = document.getElementsByClassName("help");
// Die Event Handler werden an ein DIV gebunden. Gefeuert werden sie dann aber
// von den darin eingeschlossenen IMG. Von denen aus muss dann zum Tooltip
// navigiert werden.
for (var i = 0; i < helpbuttons.length; i++) {
    var helpButton = helpbuttons[i];
    helpButton.onmousedown = function (ev) {
        // Zuerst alle Tooltips schließen.
        for (var i = 0; i < helpbuttons.length; i++) {
            var helpButton_1 = helpbuttons[i];
            var tooltip_1 = helpButton_1.getElementsByClassName("help_content")[0];
            tooltip_1.className = "help_content";
        }
        // Dann den gewünschten öffnen.
        var helpImage = ev.target;
        var helpButton = helpImage.parentElement;
        var tooltip = helpButton.getElementsByClassName("help_content")[0];
        tooltip.className = "help_content show";
    };
    var closeButton = helpButton.getElementsByClassName("help_close")[0];
    closeButton.onmousedown = function (ev) {
        var closeImage = ev.target;
        var closeDiv = closeImage.parentElement;
        var tooltip = closeDiv.parentElement;
        tooltip.className = "help_content";
    };
}
