/* eslint-disable */
"use strict";

var blessed = require("blessed");

function Dashboard(options) {
    var title = options && options.title || "Crossbow";

    this.color = options && options.color || "gray";
    this.minimal = options && options.minimal || false;
    this.setData = this.setData.bind(this);

    this.screen = blessed.screen({
        smartCSR: true,
        title: title,
        dockBorders: false,
        fullUnicode: true,
        autoPadding: true
    });

    this.layoutLog.call(this);
    this.layoutStatus.call(this);

    this.screen.key(["escape", "q", "C-c"], function() {
        process.exit(0);
    });

    this.screen.render();
}

Dashboard.prototype.setData = function(dataArr) {
    var self = this;

    dataArr.forEach(function(data) {
        switch (data.type) {
            case "progress": {
    //             var percent = parseInt(data.value * 100);
    //             if (self.minimal) {
    //                 percent && self.progress.setContent(percent.toString() + "%");
    //             } else {
    //                 percent && self.progressbar.setContent(percent.toString() + "%");
                    self.progressbar.setProgress(data.value);
    //             }
                break;
            }
            case "operations": {
                // self.operations.setContent(data.value);
                break;
            }
            case "status": {
                var content;
                switch(data.value) {
                    case "running":
                        content = "{yellow-fg}{bold}" + 'Running...' + "{/}";
                        break;
                    case "error":
                        content = "{red-fg}{bold}" + 'FAILED' + "{/}";
                        break;
                    case "success":
                        content = "{green-fg}{bold}" + 'Success' + "{/}";
                        break;
                }
                self.operations.setContent(content);
                break;
            }
            case "stats": {
                break;
            }
            case "log": {
                self.logText.log(data.value);
                break;
            }
            case "clear": {
    //             self.logText.setContent("");
                break;
            }
        }
    });

    this.screen.render();
};

Dashboard.prototype.layoutLog = function() {

    this.log = blessed.box({
        label: "Crossbow Log",
        padding: 1,
        width: "100%",
        height: "100%",
        left: "0%",
        top: "0%",
        border: {
            type: "line",
        },
        style: {
            fg: -1,
            border: {
                fg: this.color,
            },
        },
    });

    this.logText = blessed.log({
        parent: this.log,
        tags: true,
        width: "100%-5",
        scrollable: true,
        input: true,
        alwaysScroll: true,
        scrollbar: {
            ch: " ",
            inverse: true
        },
        keys: true,
        vi: true,
        mouse: true
    });

    this.screen.append(this.log);
};

Dashboard.prototype.layoutStatus = function() {

    this.wrapper = blessed.layout({
        width: this.minimal ? "100%" : "25%",
        height: this.minimal ? "30%" : "42%",
        top: this.minimal ? "70%" : "0%",
        left: this.minimal ? "0%" : "75%",
        layout: "grid"
    });

    this.operations = blessed.box({
        parent: this.wrapper,
        label: "Status",
        tags: true,
        padding: {
            left: 1,
        },
        width: this.minimal ? "34%" : "100%",
        height: this.minimal ? "100%" : "34%",
        valign: "middle",
        border: {
            type: "line",
        },
        style: {
            fg: -1,
            border: {
                fg: this.color,
            },
        },
    });

    this.progress = blessed.box({
        parent: this.wrapper,
        label: "Progress",
        tags: true,
        padding: this.minimal ? {
            left: 1,
        } : 1,
        width: this.minimal ? "33%" : "100%",
        height: this.minimal ? "100%" : "34%",
        valign: "middle",
        border: {
            type: "line",
        },
        style: {
            fg: -1,
            border: {
                fg: this.color,
            },
        },
    });

    this.progressbar = blessed.ProgressBar({
        parent: this.progress,
        height: 1,
        width: "90%",
        top: "center",
        left: "center",
        hidden: this.minimal,
        orientation: "horizontal",
        style: {
            bar: {
                bg: this.color,
            },
        }
    });

    this.screen.append(this.wrapper);
};

module.exports = Dashboard;
