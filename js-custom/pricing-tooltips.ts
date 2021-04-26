let helpbuttons = document.getElementsByClassName("help");

// Die Event Handler werden an ein DIV gebunden. Gefeuert werden sie dann aber
// von den darin eingeschlossenen IMG. Von denen aus muss dann zum Tooltip
// navigiert werden.

for(var i=0; i<helpbuttons.length; i++) {
    let helpButton = helpbuttons[i] as HTMLElement;
    helpButton.onmousedown = (ev) => {
        // Zuerst alle Tooltips schließen.
        for(var i=0; i<helpbuttons.length; i++) {
            let helpButton = helpbuttons[i] as HTMLElement;
            let tooltip = helpButton.getElementsByClassName("help_content")[0] as HTMLElement;
            tooltip.className = "help_content";
        }

        // Dann den gewünschten öffnen.
        let helpImage = ev.target as HTMLElement;
        let helpButton = helpImage.parentElement;
        let tooltip = helpButton.getElementsByClassName("help_content")[0] as HTMLElement;
        tooltip.className = "help_content show";
    }

    let closeButton = helpButton.getElementsByClassName("help_close")[0] as HTMLElement;
    closeButton.onmousedown = (ev) => {
        let closeImage = ev.target as HTMLElement;
        let closeDiv = closeImage.parentElement;
        let tooltip = closeDiv.parentElement;
        tooltip.className = "help_content";
    }
}





