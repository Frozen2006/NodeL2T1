var url = require('url'),
    cheerio = require('cheerio'),
    request = require('request'),
    async = require('async'),
    fs = require('fs'),
    argv = require('optimist').argv;

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

var _constructPageLoadFunction = function (pageUrl) {
    return function (callback) {
        request(pageUrl, function (error, response, body) {
            if (error) {
                if (error.code === 'ETIMEDOUT') {
                    return callback(null, []);
                }
                return callback(error);
            }
            $ = cheerio.load(body);
            var dataArray = [];

            $('a').each(function (index, element) {
                dataArray.push($(element).attr('href'));
            });

            var filteredData = dataArray.filter(onlyUnique).filter(function (element) {
                if (typeof element !== 'undefined') {
                    if (element.indexOf('/') === 0) {
                        return element;
                    } else {
                        if (element.indexOf('http') === 0) {
                            return element;
                        }
                    }
                }
            }).map(function (element) {
                if (element.indexOf('/') === 0) {
                    return url.resolve(pageUrl, element);
                }
                return element;
            }).slice(0, 9);

            return callback(null, filteredData);
        });
    }
};

var _constructUrlsLoading = function (currentLevelUrlsLoading) {
    var tasksList = currentLevelUrlsLoading.map(function (element) {
        return _constructPageLoadFunction(element);
    });

    return tasksList;
};

var result = [];

var _logCurrentLevel = function (level, urls) {
    console.log('Current level is %s \n\r', level);
    console.log(urls);
    console.log('\n\r');

    result = result.concat(urls);
};

var _constructLoadUrlArray = function (level) {
    return function (urls, callback) {
        async.parallel(_constructUrlsLoading(urls), function (err, results) {
            
            if (err) {
                return callback(err);
            }
            
            var result = [];
            results.forEach(function (element) {
                result = result.concat(element);
            });
            result = result.filter(onlyUnique);
            
            _logCurrentLevel(level, result);

            callback(null, result);
        });
    }
};


var _parse = function (startUrl, deep) {
    var deepingList = [function (callback) {  //first function didn't take a list
        callback(null, [startUrl]);
    }];
    for (var i = 0; i < deep; i++) {
        deepingList.push(_constructLoadUrlArray(i));
    }

    async.waterfall(deepingList, function (err, result) {
        if (err) {
            console.log(err);
        }

        fs.writeFile('result.json', JSON.stringify(result), function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("JSON saved to result.json");
            }
        }); 
    });
};



(function () {
    if (!argv.url || !argv.level) {
        console.log('Where is a params???');
    };
    var startUrl = argv.url;//'http://www.composite.net/';
    var deep = parseInt(argv.level);
    _parse(startUrl, deep);
})();