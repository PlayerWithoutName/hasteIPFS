class Api {
    constructor() {
    }

    add() {
        alert("not implemented")
    }

    cat() {
        alert("not implemented")
    }
}

class Document {
    constructor() {
        if (window.ipfs) {
            this.api = window.ipfs
        } else {
            this.api = new Api()
        }
        $("#box code").html("")
    }

    load(location) {
        this.dataPromise = this.api.cat(location)
    }

    async waitForData(callback) {
        let decoder = new TextDecoder()
        this.content = decoder.decode(await this.dataPromise)
        this.display()
        $("#box").show()
    }

    save(content) {
        this.dataPromise = this.api.add(new Buffer(content, "utf-8"))
    }

    async waitForSave(callback) {
        callback(await this.dataPromise)
    }

    display() {
        let highlighted = null
        let hash = document.location.hash

        let extensions = {
            rb: "ruby", py: "python", pl: "perl", php: "php", scala: "scala", go: "go",
            xml: "xml", html: "xml", htm: "xml", css: "css", js: "javascript", vbs: "vbscript",
            lua: "lua", pas: "delphi", java: "java", cpp: "cpp", cc: "cpp", m: "objectivec",
            vala: "vala", cs: "cs", sql: "sql", sm: "smalltalk", lisp: "lisp", ini: "ini",
            diff: "diff", bash: "bash", sh: "bash", tex: "tex", erl: "erlang", hs: "haskell",
            md: "markdown", txt: "", coffee: "coffee", json: "javascript", c: "cpp"
        }

        if(hash.includes(".")){
            let index = hash.lastIndexOf(".")
            highlighted = hljs.highlight(extensions[hash.substring(index+1, hash.length)], this.content)
        }else{
            highlighted = hljs.highlightAuto(this.content)
        }

        $("#box code").html(highlighted.value)

        let h = "";
        for (let i = 0; i < this.content.split("\n").length; i++) {
            h += (i + 1).toString() + "<br/>";
        }
        $("#linenos").html(h);
    }
}

class HasteIPFS {
    constructor() {
        this.doc = new Document()
        this.load()
        this.configureButtons()
    }

    load() {
        let hash = document.location.hash
        if (!hash || hash < 47) {
            hash = "#QmbHiJDaj6v7xVv9VYf3KpgZZ7xQHejfziUV3Wm5ge2W5E"//about
            //hash = "#QmNYLTVdHju9iFu7nDdmj91DJPhZiBdCxvgfatjLUHmq8z"//hello.c
        }
        if(hash.includes(".")){
            let index = hash.lastIndexOf(".")
            if(!hash.includes("/")){
                hash = hash.substring(0, index)
            }
        }
        this.doc.load(hash.substring(1, hash.length))
        this.doc.waitForData()
    }

    configureButtons() {
        let _this = this;
        this.buttons = [
            {
                $where: $('#box2 .save'),
                label: 'Save',
                shortcutDescription: 'control + s',
                shortcut: function(evt) {
                    return evt.ctrlKey && (evt.keyCode === 83);
                },
                action: function() {
                    if (_this.$textarea.val().replace(/^\s+|\s+$/g, '') !== '') {
                        _this.locked = true
                    }
                }
            },
            {
                $where: $('#box2 .new'),
                label: 'New',
                shortcut: function(evt) {
                    return evt.ctrlKey && evt.keyCode === 78
                },
                shortcutDescription: 'control + n',
                action: function() {
                    _this.doc = new Document()
                    alert("lol")
                }
            },
            {
                $where: $('#box2 .duplicate'),
                label: 'Duplicate & Edit',
                shortcut: function(evt) {
                    return _this.doc.locked && evt.ctrlKey && evt.keyCode === 68;
                },
                shortcutDescription: 'control + d',
                action: function() {
                    _this.duplicateDocument();
                }
            },
            {
                $where: $('#box2 .raw'),
                label: 'Just Text',
                shortcut: function(evt) {
                    return evt.ctrlKey && evt.shiftKey && evt.keyCode === 82;
                },
                shortcutDescription: 'control + shift + r',
                action: function() {
                    window.location.href = _this.doc.key;
                }
            },
            {
                $where: $('#box2 .twitter'),
                label: 'Twitter',
                shortcut: function(evt) {
                    return _this.options.twitter && _this.doc.locked && evt.shiftKey && evt.ctrlKey && evt.keyCode == 84;
                },
                shortcutDescription: 'control + shift + t',
                action: function() {
                    window.open('https://twitter.com/share?url=' + encodeURI(window.location.href));
                }
            }
        ];
        for (var i = 0; i < this.buttons.length; i++) {
            this.configureButton(this.buttons[i]);
        }
    }

    configureButton(options) {
        // Handle the click action
        options.$where.click(function(evt) {
            evt.preventDefault();
            if (!options.clickDisabled && $(this).hasClass('enabled')) {
                options.action();
            }
        });
        // Show the label
        options.$where.mouseenter(function(evt) {
            $('#box3 .label').text(options.label);
            $('#box3 .shortcut').text(options.shortcutDescription || '');
            $('#box3').show();
            $(this).append($('#pointer').remove().show());
        });
        // Hide the label
        options.$where.mouseleave(function(evt) {
            $('#box3').hide();
            $('#pointer').hide();
        });
    };
}

$(function () {
    new HasteIPFS()
})