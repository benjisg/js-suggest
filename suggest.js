/*
    suggest.js
    Authored by Benji Schwartz-Gilbert
    
    Provides an encapsulated module to handle ajax filled suggestions for queries and searches as they are typed into a text 
    input box. Provides optional overloading of styling, parsing, and formatting methods, automatic library detection for JSON support,
    and a bundled AJAX request handler
    
    The MIT License

	Copyright (c) 2011 Benji Schwartz-Gilbert

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
	
*/

var suggest = function(input_id, request_url, options) {
    var doc = document, // Pre-fetch the document object
    jsonparse, // Builds a JSON object from a string
    
    /* DOM references */
        inputElement, // Reference to the input element
        resultsElement, // Reference to the results/output element
    
    /* AJAX Request parameters */
        dataRequestUrl, // URL to send match requests to
        searchKeyName = "find", // POST key name for search suggestions
        detailsKeyName = "details", // POST key name for full title details requests
        priorityId, // Id of the AJAX request
    
    /* Functionality Options */
        inputReset = false, // Should the search box have its current text selected everytime someone clicks on it after it loses focus
        
        /* Function that handles output when an item is selected from the search results */
        useDetails = function(results) {
            if(typeof console !== "undefined") {
                console.log(results);
            }
        },
        
        /* The default result line formatter which renders the search term in bold */
        resultLineFormatter = function(searchvalue, returneditems) {
            var match_start_index, result = [], value;
            for(var i = 0, len = returneditems.length;i < len; i++) {
                value = returneditems[i];
                match_start_index = (value.toLowerCase()).indexOf(searchvalue.toLowerCase());
                
                if(match_start_index > -1) {
                    result.push(value.substring(0, match_start_index) + "<b>" +  value.substring(match_start_index, (match_start_index+(searchvalue.length))) + "</b>" + value.substring(match_start_index + (searchvalue.length)));
                } else {
                    result.push(value);
                }
            }
            
            return result;
        },
    
    /* Filters */
        valueFilter = /[^a-zA-Z0-9\-\'\s\.\:\+]/gm, // Default filter; alphanumeric + some punctuation and spaces
        
    /* Style class names for various conditions and displays */
        inputClass, // Class that should be given to the input box by default
        resultsClass, // Class that should be given to the results box
        errorClass, // Class that should be applied to the input box when something that conflicts with our filter is entered
        resultHighlightClass, // Class that should be applied to a results line when it is selected
        resultLineClass, // Class that should be applied to each line (div) of results in the results box
        noMatchesClass, // Class that should be applied to the no matching results message displayed in the results box
    
    /* Internal return result status trackers */
        initSuccess = false, // Did initiation complete successfully
        resultSelected = false, // Is a result selected
        filterMatches = 0, // How many results were returned
        resultIndex = null, // What result index was last selected
		lastSearch = "", // The last search term
        lastIndex = null; // The index of the previously selected result
    
    /* Setup some common tools for later use if they do not already exist */
        /* Setup string trim if it doesn't exist */
        if(typeof String.trim === "undefined") {
            String.prototype.trim = function() {
                return this.replace(/^\s+/, "").replace(/\s+$/, "");
            };
        }
        
        /* Setup hasValue check if a value is undefined or null */        
        var hasValue = function(value) {
            return ((value !== undefined) && (value !== null)); 
        };
        
        /* Setup a generic event handler creation method; returns a reference to the event handler created. */        
        var setEvent, removeEvent;
		if(typeof window.attachEvent !== "undefined") {
			// IE earlier than 9
			setEvent = function(object, type, handler) {
				(object || window).detachEvent("on"+type, handler);
				return handler;
			};
			
			removeEvent = function(object, type, eventreference) {
				(object || window).detachEvent("on"+type, eventreference);
			};
		} else {
			setEvent = function(object, type, handler) {
				(object || window).addEventListener(type, handler, true);
				return handler;
			};
			
			removeEvent = function(object, type, eventreference) {
				(object || window).removeEventListener(type, eventreference, true);
			};
		}
        
        /* General XMLHttpRequest object builder */
        var ajaxRequest = function() {
            if (window.XMLHttpRequest) {
                // code for IE7+, Firefox, Chrome, Opera, Safari
                return new XMLHttpRequest();
            }
            if (window.ActiveXObject) {
                // IE5 & IE6
                return new ActiveXObject("Microsoft.XMLHTTP");
            }
            return null;
        };
        
        /* AJAX requests that generates a unique request id which is tied to the return result */
        /* Useful for slow returns from data services where results can get stacked up and possibly come back out of order */
        var priorityLoad = function(target, data, action) {
            /* Setup an XMLHttpRequest object */
            var xmlhttp = ajaxRequest();
            var id = (new Date()).getMilliseconds();
            if(xmlhttp !== null) {
                xmlhttp.onreadystatechange = function() {
                    if(xmlhttp.readyState === 4) {
                        if(xmlhttp.status === 200) {
                            /* Execute our callback on result return */
                            action(xmlhttp.responseText, id);
                        }
                    }
                };
                xmlhttp.open("POST", target, true);
                xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xmlhttp.setRequestHeader("Content-length", data.length);
                xmlhttp.setRequestHeader("Connection", "close");
                xmlhttp.send(data);
                return id;
            }
        };
        
        (function() {
            /* We need either native JSON parsing support or the built-in support of a library; try to guess if one has been included */
			if((typeof JSON === "undefined") || (typeof JSON.parse === "undefined")) {
                if(typeof jQuery !== "undefined") {
                    jsonparse = (function() { 
                        return function(data) {
                            try {
                                return jQuery.parseJSON(data); 
                            } catch(e) {
                                // Check if the console is available so we can do a user friendly (non-obstructive) error output message
                                if(typeof console !== "undefined") {
                                    console.log("Invalid JSON");
                                }
                            }
                        };
                    })();
                } else if(typeof YUI() !== "undefined") {
                    if(typeof YUI().JSON === "undefined") {
                        YUI().use('json-parse', function(Y) {
                            // Reference this module and bind the jsonparse property
                            jsonparse = (function(Y) {
                                return function(data) {
                                    try {
                                        return Y.JSON.parse(data);
                                    } catch(e) {
                                        // Check if the console is available so we can do a user friendly (non-obstructive) error output message
                                        if(typeof console !== "undefined") {
                                            console.log("Invalid JSON");
                                        }
                                    }
                                };
                            })(Y);
                        });
                    } else {
                        jsonparse = Y.JSON.parse;
                    }
                } else {
                    if(typeof console !== "undefined") {
                        console.log("No ability to parse json exists");
                    }
                }
            } else {
                jsonparse = function(data) {
                    try {
                        return JSON.parse(data);
                    } catch(e) {
                        // Check if the console is available so we can do a user friendly (non-obstructive) error output message
                        if(typeof console !== "undefined") {
                            console.log("Invalid JSON");
                        }
                    }
                };
            }
        })();
    
    /* Handles the initiation options, including filling in values for any options given */
    var init = function(time_waited) {
        var valid_input_id = false; // Initially assume input id is invalid
        
        // If we don't even have a request url there is no point continuing
        if(hasValue(request_url)) {
            dataRequestUrl = request_url;
            
            if(hasValue(input_id)) {
                inputElement = doc.getElementById(input_id);
                if(hasValue(inputElement)) {
                    valid_input_id = true; // About as valid as we can get without wading into browser support for typeof === an input element
                } else {
                    // The page might not be loaded yet; wait for up to 1 second
                    if(time_waited < 1000) {
                        setTimeout(function() { init(time_waited += 50); }, 50);
                    }
                }
            }
            
            if(valid_input_id) {
                // If no options were specified at all, setup the minimum structure we need so we aren't attempting to access properties of an undefined object
                if(!hasValue(options)) {
                    options = {core : {}};
                }
                
                if(hasValue(options.styling)) {
                    // Overload the input class if specified
                    if(hasValue(options.styling.input_class)) {
                        inputClass = options.styling.input_class;
                    } else {
                        inputClass = "";
                    }
                    
                    // Overload the results class if specified
                    if(hasValue(options.styling.results_class)) {
                        resultsClass = options.styling.results_class;
                    } else {
                        resultsClass = "";
                    }
                    
                    // Overload the error class if specified
                    if(hasValue(options.styling.error_class)) {
                        errorClass = options.styling.error_class;
                    } else {
                        errorClass = "";
                    }
                    
                    // Overload the result line class if specified
                    if(hasValue(options.styling.result_line_class)) {
                        resultLineClass = options.styling.result_line_class;
                    } else {
                        resultLineClass = "";
                    }
                    
                    // Set the result highlighting class if given
                    if(hasValue(options.styling.result_highlight_class)) {
                        resultHighlightClass = options.styling.result_highlight_class;
                    } else {
                        resultHighlightClass = "";
                    }
                    
                    // Overload the no result matches class if specified
                    if(hasValue(options.styling.no_matches_class)) {
                        noMatchesClass = options.styling.no_matches_class;
                    } else {
                        noMatchesClass = "";
                    }
                    
                    // Add the start text class if specified
                    if(hasValue(options.styling.start_class)) {
                        inputElement.className = options.styling.start_class;
                    }
                }
                
                if(hasValue(options.behavior)) {
                    // Set the input reset option if given as true
                    if(hasValue(options.behavior.input_reset)) {
                        if(options.behavior.input_reset === true) {
                            inputReset = true;
                        }
                    }
                    
                    // Set the POST suggestion parameter name
                    if(hasValue(options.behavior.suggestions_post_key) && (options.behavior.suggestions_post_key !== "")) {
                        searchKeyName = options.behavior.suggestions_post_key;
                    }
                    
                    // Set the POST suggestion parameter name
                    if(hasValue(options.behavior.details_post_key) && (options.behavior.details_post_key !== "")) {
                        detailsKeyName = options.behavior.details_post_key;
                    }
                }
                
                if(hasValue(options.core)) {
                    if(!hasValue(options.core.results_id)) {
                        // Results box is not setup, we need to add it to the DOM
                        var results_box = doc.createElement("div");
                        results_box.id = "suggest_results";
                        
                        if(resultsClass !== undefined) {
                            results_box.className = resultsClass;
                        }
                        
                        results_box.style.visibility = "hidden"; // Make sure it's hidden, even if a class was provided
                        
                        var next_node; // Reference to the current DOM node after the input element
                        
                        // Check for Gecko support of nextElementSibling to avoid accidentally hitting a whitespace node
                        if((typeof Element !== "undefined") && (typeof Element.nextElementSibling !== "undefined")) {
                            next_node = inputElement.nextElementSibling;
                        } else {
                            // Older versions of Gecko and all other browsers
                            next_node = inputElement.nextSibling;
                        }
                        
                        // Insert the results_box element right after the input element
                        var parent_node = inputElement.parentNode;
                        if(hasValue(parent_node)) {
                            parent_node.insertBefore(results_box, next_node);
                        }
                        
                        resultsElement = results_box; // Store a reference to the results element
                        initSuccess = true;
                    } else {
                        resultsElement = doc.getElementById(options.core.results_id);
                        resultsElementId = options.results_id;
                        
                        resultsElement.style.visibility = "hidden";
                        initSuccess = true;
                    }
                    
                    // If a special formatter for parsing out individual results from the data service is specified, set it up
                    if(options.core.formatter !== undefined) {
                        resultLineFormatter = options.core.formatter;
                    }
                    
                    // Setup the function that uses the search results
                    if(options.core.output !== undefined) {
                        useDetails = options.core.output;
                    }
                    
                    // Overload the default value filter; use at your own peril
                    if(options.core.valuefilter !== undefined) {
                        valueFilter = options.core.valuefilter;
                    }
                }
                
                // If the initiation went okay, go through with setting up the search box
                if(initSuccess) {
                    setupSearchBox();
                }
            }
        } else {
            if(typeof console !== "undefined") {
                console.log("Data service URL to send queries to was not given");
            }
        }
    };
    
    /* Initial setup of the input element */
    var setupSearchBox = function() {
        // If the inputReset option was set as true, bind that action now
        if(inputReset) {
            setEvent(inputElement, "click", function() {
                inputElement.value = "";
            });
        }
        
        /* Setup a focus event on the search box to remove the initial instruction text then destroy itself */
        var oneTimeFocus = setEvent(inputElement, "focus", function() {
            inputElement.value = "";
            setSearchBoxClass("input");
            removeEvent(inputElement, "focus", oneTimeFocus);
        });
        
        /* Setup the keydown event */
        setEvent(inputElement, "keydown", function(e) {
            e = (e||window.event);
            var kn = e.keyCode;
            
            // Allow a short delay for Webkit browsers; they do not update input value until after the keyevent finishes
            setTimeout(function() {
                keyFilter(kn);
            }, 10);
        });
        
        /* Clear the results box when a click is registered that steals focus away */
        setEvent(inputElement, "blur", function() {
            parseSelection();
            clearSuggestions();
        });
    };
    
    /* Set the class/style on the search box */
    var setSearchBoxClass = function(type) {
        if(type === "error") {
            // Use the errorClass if it's set
            if(hasValue(errorClass)) {
                inputElement.className = errorClass;
            // Set a basic default style if not
            } else {
                inputElement.style.backgroundColor = "#c10000";
                inputElement.style.color = "#FFFFFF";
            }
        } else {
            // Use the inputClass if it's set
            if(hasValue(inputClass)) {
                inputElement.className = inputClass;
            // Set a basic default style if not
            } else {
                inputElement.style.backgroundColor = "#FFFFFF";
                inputElement.style.color = "#000000";
            }
        }
    };
    
    /* Filter the incoming keys and setup the special actions for up arrow, down arrow, and enter. Pass all others through to be entered as text */
    var keyFilter = function(kn) {
        if(hasValue(kn)) {
            // Capture Up Arrow, Down Arrow, and Enter
            if((kn === 38) || (kn === 40) || (kn === 13)) {
                // Handle Down Arrow
                if(kn === 38) {
                    if(filterMatches > 0) {
                        // Reset the class of the last results index element
                        clearLastResultClass();

                        // At the top of the results list; cycle around to the bottom
                        // Use == here because this action is safer if there does happen to be a false positive
                        if((resultIndex == 0) || (resultIndex == null)) {
                            resultIndex = filterMatches - 1;
                        } else {
                            resultIndex -= 1;
                        }
                        
                        // Handle class and id switching for new selected index element
                        var current_index_element = resultsElement.childNodes[resultIndex];
                        current_index_element.className = resultHighlightClass;
                        lastIndex = current_index_element.id;
                        
                        resultSelected = true;
                    }
                // Handle Up Arrow
                } else if(kn === 40) {
                    if(filterMatches > 0) {
                        // Reset the class of the last results index element
                        clearLastResultClass();
                        
                        // At the top of the results list; cycle around to the bottom
                        if((resultIndex === (filterMatches - 1)) || (resultIndex === null)) {
                            resultIndex = 0;
                        } else {
                            resultIndex += 1;
                        }
                        
                        // Handle class and id switching for new selected index element
                        var current_index_element = resultsElement.childNodes[resultIndex];
                        current_index_element.className = resultHighlightClass;
                        lastIndex = current_index_element.id;
                        
                        resultSelected = true;
                    }
                // Enter key
                } else {                    
                    // Only 1 result returned; automatically select it
                    if(filterMatches === 1) {
                        resultSelected = true;
                        resultIndex = 0;
                        lastIndex = "suggest_result_0";
                    }
                    
                    // Check that results were returned and one was selected
                    if((filterMatches > 0) && (resultSelected)) {
                        parseSelection();
                        clearSuggestions();
                    } else {
                        setSearchBoxClass("error");
                    }
                }
            } else {
                resultSelected = false;
                checkValue();
            }
        }
    };
    
    /* Parses the current selection or the no-type search value (if given) and fires a request to the server with useDetails as the success callback */
    var parseSelection = function(no_type_search) {
        var value = "", elem;
        
        // Check if a no-type search value was given
        if(hasValue(no_type_search)) {
            // We have our value so set our filter to true
            resultSelected = true;
            value = unescape(no_type_search);            
        // Otherwise assume this is a normal search
        } else if(hasValue(lastIndex) && lastIndex !== "") {
            value = (doc.getElementById(lastIndex)).innerHTML;
        }
        
        if(value !== "") {
            var elem = (value).replace(/<.*?>/gi, "").replace("&amp;", "&");
            if(resultSelected && hasValue(elem)) {
                inputElement.value = elem;
                clearSuggestions();
                lastSearch = elem;
                priorityId = priorityLoad(dataRequestUrl, buildCurrentRequest(elem, detailsKeyName), function(response, id) {
                    if(priorityId === id) {
                        useDetails(jsonparse(response));
                    }
                });
            } else {
                setSearchBoxClass("error");
            }
        }
    };
    
    /* Checks to see if a valid result was selected and parses it if so, then clears the suggestions box */
    var checkSelection = function() {
        if((resultSelected) && hasValue(lastIndex)) {
            parseSelection();
        }
        clearSuggestions();
    };
    
    /* Resets the search box class, clears the results box, and resets the lastIndex */
    var clearSuggestions = function() {
        setSearchBoxClass("input");
        resultsElement.style.visibility = "hidden";
        resultsElement.innerHTML = "";
        lastIndex = null;
    };
    
    /* Removes the highlight class from the last selected result line */
    var clearLastResultClass = function() {
        if(hasValue(lastIndex)) {
            doc.getElementById(lastIndex).className = resultLineClass;
        }
    };
    
    /* Clears the filterMatches count then adds the "no matches" message to the results box */
    var noMatches = function() {
        filterMatches = 0;
        
        var no_match_message = doc.createElement("div");
        no_match_message.className = noMatchesClass;
        no_match_message.innerHTML = "Sorry, no matches found.";
        
        resultsElement.innerHTML = "";
        resultsElement.appendChild(no_match_message);
    };
    
    /* Simple POST data string builder for requests */
    var buildCurrentRequest = function(search, type) {
        return (searchKeyName + "=" + encodeURIComponent(search) + "&type=" + type);
    };
    
    /* Checks the current search value against filter and sets up then executes Ajax request to the data service */
    var checkValue = function() {
        var v = (inputElement.value).trim(), vF, i, match, items;
        if(hasValue(v) && (v !== "")) {
            vF = v.replace(valueFilter, "");
            if(vF !== v) {
                setSearchBoxClass("error");
            } else {
                setSearchBoxClass("input");
                if(vF !== lastSearch) {
                    lastSearch = vF;
                    priorityId = priorityLoad(dataRequestUrl, buildCurrentRequest(vF, "lookup"), function(response, id) {
                        if(priorityId === id) {
                            if(response !== "") {
                                
                                // Convert from string to json
                                items = jsonparse(response);
                                
                                // Reset filter tracking stats
                                filterMatches = 0;
                                resultIndex = null;
                                resultSelected = false;
                                
                                // Clear the results box
                                clearSuggestions();
                                
                                for(category in items) {
                                    if(items.hasOwnProperty(category)) {
                                        filterMatches = items[category].length;
                                        
                                        // Retrieve the formatted result lines
                                        var lines = resultLineFormatter(vF, items[category]);
                                        
                                        if(hasValue(lines)) {
                                            for(line in lines) {
                                                if(lines.hasOwnProperty(line)) {
                                                    var result_text = doc.createElement("div");
                                                    result_text.innerHTML = lines[line];
                                                    result_text.name = "suggest_result_" + line;
                                                    result_text.style.width = "100%";
                                                    result_text.style.cursor = "pointer";
                                                    result_text.className = resultLineClass;
                                                    result_text.id = "suggest_result_" + line;
                                                    
                                                    /* Highlight result on mouseover */
                                                    setEvent(result_text, "mouseover", (function(id) { 
                                                        return function() {
                                                            clearLastResultClass();
                                                            document.getElementById(id).className = resultHighlightClass;
                                                            lastIndex = id;
                                                            resultSelected = true;
                                                        };
                                                    })("suggest_result_" + line));
                                                    
                                                    /* Clear the highlight result class on mouseout */
                                                    setEvent(result_text, "mouseout", function() {
                                                        clearLastResultClass();
                                                        resultSelected = false;
                                                    });
                                                    
                                                    /* Parse the element to fill in value and submit */
                                                    setEvent(result_text, "click", function() {
                                                        parseSelection();
                                                    });
                                                    
                                                    resultsElement.appendChild(result_text);
                                                }
                                            }
                                        }
                                    }
                                }
                                if(filterMatches === 0) {
                                    noMatches();
                                }
                                resultsElement.style.visibility = "visible";
                            }
                        }
                    });
                }
            }
        } else {
            lastSearch = "";
            clearSuggestions();
        }
    };
    
    /* Run some initial setup operations */
    init(0);
    
    /* Return publicly accessible methods */
    return {
        /* A function for submitting a details search through other means (links, buttons, etc) */
        noTypeSubmit : function(value) {
            parseSelection(value);
        }
    };
};