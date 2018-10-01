///// represents a single document

let haste_document = function () {
    this.locked = false;
    $('.logo').click(function (){
        window.location = '#QmbHiJDaj6v7xVv9VYf3KpgZZ7xQHejfziUV3Wm5ge2W5E.md'
    });
};

haste_document.prototype.htmlEscape = function (s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
};

haste_document.prototype.load = function (key, callback) {
    let parts = [null, null];
    let p = key.split('.');
    parts[1] = p.pop()
    parts[0] = p.join('.')
    if (parts[0] === "") {
        parts[0] = parts[1]
        parts[1] = null
    }
    let lang = haste.extensionMap[parts[1]] || parts[1];
    let _this = this;
    let running = [];
    let fetch = function (location) {
        return $.ajax(location, {
            type: 'get',
            dataType: 'text',
            success: function (res) {
                for (let i = 0; i < running.length; i++) {
                    if (running[i] !== this) {
                        running[i].abort();
                    }
                }
                _this.locked = true;
                _this.key = location;
                _this.data = res;
                let high = '';
                try {
                    if (lang === 'txt') {
                        high = {value: _this.htmlEscape(res)};
                    }
                    else if (lang) {
                        high = hljs.highlight(lang, res);
                    }
                    else {
                        high = hljs.highlightAuto(res);
                    }
                } catch (err) {
                    // failed highlight, fall back on auto
                    high = hljs.highlightAuto(res);
                }
                callback({
                    value: high.value,
                    key: key,
                    language: high.language || lang,
                    lineCount: res.split("\n").length
                });
            },
            error: function (err) {
                if (running.length === 1) {
                    callback(false);
                }
            }
        });
    };

    let api_fetch = function (location) {
        let req = window.ipfs.get(location);

        req.then(result => {
            if(result.length>1){

            }
            _this.locked = true;
            _this.key = location;
            let dec = new TextDecoder('UTF-8');
            let res = dec.decode(result[0].content);
            _this.data = res;
            let high = '';
            try {
                if (lang === 'txt') {
                    high = {value: _this.htmlEscape(res)};
                }
                else if (lang) {
                    high = hljs.highlight(lang, res);
                }
                else {
                    high = hljs.highlightAuto(res);
                }
            } catch (err) {
                // failed highlight, fall back on auto
                high = hljs.highlightAuto(res);
            }
            callback({
                value: high.value,
                key: key,
                language: high.language || lang,
                lineCount: res.split("\n").length
            });
        })

        req.catch(function (err) {
            console.log(err);
            return fetch('/ipfs/' + location);
        })

        return req;
    };
    if (window.ipfs) {
        api_fetch(parts[0]);
        api_fetch(key);
    } else {
        fetch('/ipfs/' + parts[0]);
        fetch('/ipfs/' + key);
    }
};

haste_document.prototype.save = function (data, callback) {
    if (this.locked) {
        return false;
    }
    this.data = data;
    let _this = this;
    if (window.ipfs) {
        let buffered = new Buffer(data, 'utf-8');

        let savePromise = window.ipfs.add(buffered);
        savePromise.then(function (res) {
            console.log(res);
            _this.locked = true;
            _this.key = res[0].path;
            let high = hljs.highlightAuto(data);
            callback(null, {
                value: high.value,
                key: res[0].path,
                language: high.language,
                lineCount: data.split("\n").length
            });
        });
        savePromise.catch(function (res) {
            app.showMessage(res, 'error')
        });
    }

};

///// represents the paste application

let haste = function (appName, options) {
    this.appName = appName;
    this.$textarea = $('textarea');
    this.$box = $('#box');
    this.$code = $('#box code');
    this.$linenos = $('#linenos');
    this.options = options;
    this.configureShortcuts();
    this.configureButtons();
    // If twitter is disabled, hide the button
    if (!options.twitter) {
        $('#box2 .twitter').hide();
    }
    // If no window.ipfs, hide the new, save and duplicate buttons
    if(!window.ipfs){
        $('#box2 .save').hide();
        $('#box2 .duplicate').hide();
        $('#box2 .new').hide();
        this.showMessage('No IPFS Companion detected, Save, New and Duplicate functions disabled.', 'info')
    }
};

// Set the page title - include the appName
haste.prototype.setTitle = function (ext) {
    document.title = ext ? this.appName + ' - ' + ext : this.appName;
};

// Show a message box
haste.prototype.showMessage = function (msg, cls) {
    let msgBox = $('<li class="' + (cls || 'info') + '">' + msg + '</li>');
    $('#messages').prepend(msgBox);
    setTimeout(function () {
        msgBox.slideUp('fast', function () {
            $(this).remove();
        });
    }, 3000);
};

// Show the light key
haste.prototype.lightKey = function () {
    this.configureKey(['new', 'save']);
};

// Show the full key
haste.prototype.fullKey = function () {
    this.configureKey(['new', 'duplicate', 'twitter', 'raw']);
};

// Set the key up for certain things to be enabled
haste.prototype.configureKey = function (enable) {
    let $this, i = 0;
    $('#box2 .function').each(function () {
        $this = $(this);
        for (i = 0; i < enable.length; i++) {
            if ($this.hasClass(enable[i])) {
                $this.addClass('enabled');
                return true;
            }
        }
        $this.removeClass('enabled');
    });
};

// Remove the current document (if there is one)
// and set up for a new one
haste.prototype.newDocument = function (hideHistory) {
    //this.loadAbout();
    // TODO(Kubuxu): New documents
    //return
    this.$box.hide();
    this.doc = new haste_document();
    window.location = '#';
    if (!hideHistory) {
        //window.history.pushState(null, this.appName, '/');
    }
    this.setTitle();
    this.lightKey();
    this.$textarea.val('').show('fast', function () {
        this.focus();
    });
    this.removeLineNumbers()
};

// Map of common extensions
// Note: this list does not need to include anything that IS its extension,
// due to the behavior of lookupTypeByExtension and lookupExtensionByType
// Note: optimized for lookupTypeByExtension
haste.extensionMap = {
    rb: 'ruby', py: 'python', pl: 'perl', php: 'php', scala: 'scala', go: 'go',
    xml: 'xml', html: 'xml', htm: 'xml', css: 'css', js: 'javascript', vbs: 'vbscript',
    lua: 'lua', pas: 'delphi', java: 'java', cpp: 'cpp', cc: 'cpp', m: 'objectivec',
    vala: 'vala', cs: 'cs', sql: 'sql', sm: 'smalltalk', lisp: 'lisp', ini: 'ini',
    diff: 'diff', bash: 'bash', sh: 'bash', tex: 'tex', erl: 'erlang', hs: 'haskell',
    md: 'markdown', txt: '', coffee: 'coffee', json: 'javascript'
};

// Look up the extension preferred for a type
// If not found, return the type itself - which we'll place as the extension
haste.prototype.lookupExtensionByType = function (type) {
    for (let key in haste.extensionMap) {
        if (haste.extensionMap[key] === type) return key;
    }
    return type;
};

// Look up the type for a given extension
// If not found, return the extension - which we'll attempt to use as the type
haste.prototype.lookupTypeByExtension = function (ext) {
    return haste.extensionMap[ext] || ext;
};

// Add line numbers to the document
// For the specified number of lines
haste.prototype.addLineNumbers = function (lineCount) {
    let h = '';
    for (let i = 0; i < lineCount; i++) {
        h += (i + 1).toString() + '<br/>';
    }
    $('#linenos').html(h);
};

// Remove the line numbers
haste.prototype.removeLineNumbers = function () {
    $('#linenos').html('&gt;');
};

// Load a document and show it
haste.prototype.loadDocument = function (key) {
    // Ask for what we want
    let _this = this;
    _this.doc = new haste_document();
    _this.doc.load(key, function (ret) {
        if (ret) {
            _this.$code.html(ret.value);
            _this.setTitle(ret.key);
            _this.fullKey();
            _this.$textarea.val('').hide();
            _this.$box.show().focus();
            _this.addLineNumbers(ret.lineCount);
        }
        else {
            console.log(ret);
            _this.newDocument();
        }
    });
};

// Duplicate the current document - only if locked
haste.prototype.duplicateDocument = function () {
    if (this.doc.locked) {
        let currentData = this.doc.data;
        this.newDocument();
        this.$textarea.val(currentData);
    }
};

// Lock the current document
haste.prototype.lockDocument = function () {
    let _this = this;
    this.doc.save(this.$textarea.val(), function (err, ret) {
        if (err) {
            _this.showMessage(err.message, 'error');
        }
        else if (ret) {
            _this.$code.html(ret.value);
            _this.setTitle(ret.key);
            let file = '#' + ret.key;
            if (ret.language) {
                file += '.' + _this.lookupExtensionByType(ret.language);
            }

            window.location = file;

            _this.fullKey();
            _this.$textarea.val('').hide();
            _this.$box.show().focus();
            _this.addLineNumbers(ret.lineCount);
        }
    });
};

haste.prototype.configureButtons = function () {
    let _this = this;
    this.buttons = [
        {
            $where: $('#box2 .save'),
            label: 'Save',
            shortcutDescription: 'control + s',
            shortcut: function (evt) {
                return evt.ctrlKey && (evt.keyCode === 83);
            },
            action: function () {
                if (_this.$textarea.val().replace(/^\s+|\s+$/g, '') !== '') {
                    _this.lockDocument();
                }
            }
        },
        {
            $where: $('#box2 .new'),
            label: 'New',
            shortcut: function (evt) {
                return evt.ctrlKey && evt.keyCode === 78
            },
            shortcutDescription: 'control + n',
            action: function () {
                _this.newDocument(!_this.doc.key);
            }
        },
        {
            $where: $('#box2 .duplicate'),
            label: 'Duplicate & Edit',
            shortcut: function (evt) {
                return _this.doc.locked && evt.ctrlKey && evt.keyCode === 68;
            },
            shortcutDescription: 'control + d',
            action: function () {
                _this.duplicateDocument();
            }
        },
        {
            $where: $('#box2 .raw'),
            label: 'Just Text',
            shortcut: function (evt) {
                return evt.ctrlKey && evt.shiftKey && evt.keyCode === 82;
            },
            shortcutDescription: 'control + shift + r',
            action: function () {
                window.location.href = _this.doc.key;
            }
        },
        {
            $where: $('#box2 .twitter'),
            label: 'Twitter',
            shortcut: function (evt) {
                return _this.options.twitter && _this.doc.locked && evt.shiftKey && evt.ctrlKey && evt.keyCode == 84;
            },
            shortcutDescription: 'control + shift + t',
            action: function () {
                window.open('https://twitter.com/share?url=' + encodeURI(window.location.href));
            }
        }
    ];
    for (let i = 0; i < this.buttons.length; i++) {
        this.configureButton(this.buttons[i]);
    }
};

haste.prototype.configureButton = function (options) {
    // Handle the click action
    options.$where.click(function (evt) {
        evt.preventDefault();
        if (!options.clickDisabled && $(this).hasClass('enabled')) {
            options.action();
        }
    });
    // Show the label
    options.$where.mouseenter(function (evt) {
        $('#box3 .label').text(options.label);
        $('#box3 .shortcut').text(options.shortcutDescription || '');
        $('#box3').show();
        $(this).append($('#pointer').remove().show());
    });
    // Hide the label
    options.$where.mouseleave(function (evt) {
        $('#box3').hide();
        $('#pointer').hide();
    });
};

// Configure keyboard shortcuts for the textarea
haste.prototype.configureShortcuts = function () {
    let _this = this;
    $(document.body).keydown(function (evt) {
        let button;
        for (let i = 0; i < _this.buttons.length; i++) {
            button = _this.buttons[i];
            if (button.shortcut && button.shortcut(evt)) {
                evt.preventDefault();
                button.action();
                return;
            }
        }
    });
};

///// Tab behavior in the textarea - 2 spaces per tab
$(function () {

    $('textarea').keydown(function (evt) {
        if (evt.keyCode === 9) {
            evt.preventDefault();
            let myValue = '  ';
            // http://stackoverflow.com/questions/946534/insert-text-into-textarea-with-jquery
            // For browsers like Internet Explorer
            if (document.selection) {
                this.focus();
                sel = document.selection.createRange();
                sel.text = myValue;
                this.focus();
            }
            // Mozilla and Webkit
            else if (this.selectionStart || this.selectionStart == '0') {
                let startPos = this.selectionStart;
                let endPos = this.selectionEnd;
                let scrollTop = this.scrollTop;
                this.value = this.value.substring(0, startPos) + myValue +
                    this.value.substring(endPos, this.value.length);
                this.focus();
                this.selectionStart = startPos + myValue.length;
                this.selectionEnd = startPos + myValue.length;
                this.scrollTop = scrollTop;
            }
            else {
                this.value += myValue;
                this.focus();
            }
        }
    });

});
