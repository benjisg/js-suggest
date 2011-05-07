
js-suggest is an encapsulated javascript module that allows you to turn any text input element into an ajax enabled search box which provides suggestions from a query server

Features:

+ Completely customizable options with defaults
+ Baked in ajax, delayed initialization, results formatter, and smart key filtering
+ Input filtering that will trigger an error style on detection
+ Keyboard and Mouse navigation of search suggestions with current selection highlighting

REQUIREMENTS
------------------

__JSON serializing/deserializing of some sort__
The module will automatically use the native browser JSON object if found, otherwise it searches for the inclusion of the YUI library and then the jQuery library to bind support to the JSON object.

Currently verified to work in:

+ IE7+
+ Opera 10+
+ Firefox 3.5+
+ Safari 4+
+ Chrome
	
USAGE
--------

> var s = suggest(id, data_query_url, options_object);

Example current usage:

```javascript
var suggestor = suggest("inputElementId", "input/handle_request.php", {
	"core" : {
		"results_id" : "suggestions",
		"output" : external.formatResults,
		"valuefilter" : /[^a-zA-Z0-9\-\'\s\.\:\+\!\/\&\?\,]/gm // Overrides default filter
	},
	"styling" : {
		"error_class" : "alert",
		"input_class" : "",
		"start_class" : "start",
		"results_class" : "results-box",
		"result_highlight_class" : "highlight",
		"result_line_class" : "result",
		"no_matches_class" : "no-match"
	}
});
```

LICENSE
----------

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