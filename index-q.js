var dispatcher = _.clone(Backbone.Events);
// on viewChange hide the appView and show the loading view
dispatcher.on('viewChange', function() {
    $("#main-container .content").addClass("loading-view");
})
dispatcher.on('renderEvent', function() {
    $("#main-container .content").removeClass("loading-view");
});

App.Router = Backbone.Router.extend({
    routes: {
        "new(/)": "newRoute",
        "clone/:slug(/)": "cloneRoute",
        "clone/:slug/version/:versionnumber(/)": "cloneVersionRoute",
        "about(/)": "aboutRoute",
        "community(/)": "communityRoute",
        "chart/:slug(/)": "chartViewRoute",
        "chart/:slug/edit(/)": "chartEditRoute",
        "chart/:slug/version/:versionnumber(/)": "chartVersionViewRoute",
        "": "indexRoute",
        "search/query/:query(/tags/:tags)(/)": "queryTagSearchRoute",
        "search/tags/:tags(/)": "tagSearchRoute",
        "search(/)": "queryTagSearchRoute",
        "profile/:username(/:profileSection)(/)": "profileRoute",
        "reset": "resetRoute",
        "*path": "normalRedirect"
    },

    currview: this.currview || {},

    initialize: function() {
        Backbone.history.start({
            pushState: true
        });

        $(document.body).on('click', "[href^='/']", function(event) {
            var href = $(this).attr('href');

            if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                event.preventDefault();
            }

            //dbgconsolelog(href);
            url = href.replace(/^\//, '').replace('\#\!\/', '');
            //dbgconsolelog(url);

            router.navigate(url, {
                trigger: true
            });

        });

        $(document).ready(function() {

            $('#navbar-search-form').submit(function(e) {
                e.preventDefault();
                $('#navbar-search-submit').click();
            });

            // Add Result Suggestion to search field
            $('#navbar-search-field').devbridgeAutocomplete({
                serviceUrl: '/api/suggest',
                minChars: 2,
                deferRequestBy: 100,
                dataType: 'json',
                onSelect: function(suggestion) {
                    router.navigate("chart/"+suggestion.data.slug, {trigger: true});  
                },
                transformResult: function(response) {
                    return {
                        suggestions: $.map(response.charts, function(dataItem) {
                            return { value: dataItem.title, data: dataItem };
                        })
                    };
                },
                formatResult: function(suggestion, currentValue){
                    var posneg = (suggestion.data.positive_votes-suggestion.data.negative_votes) >= 0 ? 'positive' : 'negative';
                    return  '<div class="suggestion-sample-wrapper">'+
                                '<div class="suggestion-sample-info">'+
                                    '<div class="suggestion-sample-title text-center vertical-align-wrapper '+posneg+'">'+
                                        '<span class="vertical-middle">'+suggestion.value+'</span>'+
                                    '</div>'+
                                    '<div class="suggestion-sample-success text-center vertical-align-wrapper '+posneg+'">'+
                                        '<span class="vertical-middle">'+(suggestion.data.positive_votes-suggestion.data.negative_votes)+'</span>'+
                                    '</div>'+
                                '</div>' +
                            '</div>';
                }
            });

            $('#navbar-search-field').on('keydown.navsearch', function(e) {
                if(e.which === 13) {
                    $('#navbar-search-form').submit();
                }
            });

            $('#navbar-search-submit').click( function (e) {
                e.preventDefault();
                $('.dropdown.open .dropdown-toggle').dropdown('toggle');
                dbgconsolelog("Clicked search! Text to search for was: " + $('#navbar-search-field').val());
                var query = {query: $('#navbar-search-field').val()};
                var parsedQuery = parseSearchQuery(query.query);

                /*var cleanQuery = findTags['cleanedString'];
                _.each(findTags.tags, function(tag) {
                    dbgconsolelog("Found tag: "+tag);
                    var replaceTag = "tags:"+tag.slice(1);
                    dbgconsolelog("Replacing with: "+replaceTag);
                    cleanQuery = cleanQuery.replace(tag, replaceTag);
                    dbgconsolelog("cleanQuery is now "+cleanQuery);
                });
                query.query = cleanQuery.trim();
                dbgconsolelog(query);
                var querystring = $.param(query);*/

                var queryPath = "";
                queryPath += parsedQuery['query'] ? "/query/"+parsedQuery['query'] : "";
                queryPath += parsedQuery['tags'] ? "/tags/"+parsedQuery['tags'] : "";

                router.navigate("search"+queryPath, {trigger: true});
            });
        });
    },

    loadView: function(view) {
        //dbgconsolelog("Running loadView fn");
        /*$('#secondarypopups').remove();
        $('#contextmenus').after('<div class="secondarypopups" id="secondarypopups"></div>');*/

        /*
        var dbgout1 = ""
        for (property in this.currview) {
            dbgout1 += "Property of currview: " + property + ": " + this.currview[property] + ";\n\n";
        }
        dbgconsolelog(dbgout1);
        var dbgout2 = ""
        for (property in this) {l
            dbgout2 += "Property of this: " + property + ": " + this[property] + ";\n\n";
        }
        dbgconsolelog(dbgout2);
        */

        if (!(view instanceof App.ChartEditView)) {
            $(document).off('keydown.chartedit');
        }

        if (this.currview.talkView) {
            //dbgconsolelog("Removing talk view");
            this.currview.talkView.close();
            this.currview.removeTalkView();
        }

        if (!_.isEmpty(this.currview)) {
            //dbgconsolelog("Currview exists");
            this.currview.stopListening();
            this.currview.unbind();
            this.currview.undelegateEvents();
            //$(this).empty();
            this.currview.unbind();
        }

        if(this.currview.collection) {
            this.currview.collection.unbind();
        }

        if( (this.currview instanceof App.ChartEditView) || (this.currview instanceof App.ChartVersionView)) {
            if(this.currview.revisionsView) {
                this.currview.removeRevisionsView();
            }
        }

        if(typeof window.pcchartobj !== 'undefined' && window.pcchartobj) {
            window.pcchartobj = null;
        }

        this.currview = view;

    },

    destroyMenuViews: function() {
        if (this.currview && this.currview.menuViews) {
            //dbgconsolelog("Here are the menu views: ");
            //dbgconsolelog(this.currview.menuViews);
            //dbgconsolelog("Removing menu views");
            _.each(this.currview.menuViews, function(v) {
                if(v.secondaryviews.length < 0) {
                    _.each(v.secondaryviews, function(s) {
                        s.close();
                        s.$el.empty();
                        s.stopListening();
                        s.unbind();
                        s.undelegateEvents();
                        v.secondaryviews = _.without(v.secondaryviews, s);
                    })
                }
            })
            this.currview.removeMenuViews();
        }
    },

    destroyCollections: function() {
        if (shapecollection.length > 0) {
            //dbgconsolelog("Destroying shape collection");
            shapecollection.destroyAll();
        }

        if (arrowcollection.length > 0) {
            //dbgconsolelog("Destroying arrow collection");
            arrowcollection.destroyAll();
        }
    },

    runTagsInput: function() {
        $("input[data-role=tagsinput], select[multiple][data-role=tagsinput]").tagsinput();
    },

    indexRoute: function() {
        if (e_v != undefined && e_v.ip) {
            var self = this;
            currentUser.fetch({
                success: function() {
                    //this.profileRoute(currentUser.get("username"));
                    self.navigate("/profile/"+currentUser.get("username"), {trigger: true});
                }
            });
        }
        else {
            this.homeRoute();
        }
    },

    homeRoute: function() {
        if (!$('.home-section').length)
            dispatcher.trigger('viewChange');
        /**/onviewpage = false;
        this.destroyMenuViews();
        this.destroyCollections();
        dbgconsolelog("At the index");
        this.loadView(new App.IndexView());
        $('body').removeClass("inner-page").addClass("home");
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        document.title = "Proper Channel"
        $('.at4-share-outer').hide()
        //lmv = new App.LoginMenuView({model: currentUser});
        cleanUpCanvas();
    },

    aboutRoute: function() {
        onviewpage = false;
        this.destroyMenuViews();
        this.destroyCollections();
        dbgconsolelog("At the about page");
        this.loadView(new App.AboutView());
        //$('body').removeClass("inner-page").addClass("home");
        $('body').removeClass("home").addClass("inner-page");
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        document.title = "Proper Channel - About"
        $('.at4-share-outer').hide()
        //lmv = new App.LoginMenuView({model: currentUser});
        cleanUpCanvas();
    },

    communityRoute: function() {
        onviewpage = false;
        this.destroyMenuViews();
        this.destroyCollections();
        dbgconsolelog("At the community page");
        this.loadView(new App.CommunityView());
        $('body').removeClass("home").addClass("inner-page");
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        document.title = "Proper Channel - Community"
        $('.at4-share-outer').hide()
        //lmv = new App.LoginMenuView({model: currentUser});
        cleanUpCanvas();
    },

    normalRedirect: function(path) {
        location.href = path;
    },

    resetRoute: function() {
        location.href = '/reset';
    },

    newRoute: function() {
        dispatcher.trigger('viewChange');
        onviewpage = false;
        this.destroyMenuViews();
        this.destroyCollections();
        dbgconsolelog("Nav to new chart...");
        //this.loadView(new App.MyCanvasView());

        cleanUpCanvas();

        this.loadView(new App.NewChartView());
        $('body').removeClass("home").addClass("inner-page");
        //this.runTagsInput();
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        document.title = "Proper Channel - New Chart"
        $('.at4-share-outer').hide()
        //lmv = new App.LoginMenuView({model: currentUser});
        /*newCanvasInit();
        addCanvasUI();*/
        //this.navigate("new");
    },

    chartViewRoute: function(slug) {

        $.ajax({
                type: 'POST',
                url: '/api/chart/'+slug+'/increment',
                crossDomain: true,
                data: {
                    value: 1
                }
            });

        onviewpage = true;
        this.destroyMenuViews();
        var that = this;
        this.destroyCollections();
        dbgconsolelog("Nav to chart view for: " + slug);
        var needsrerender = false;
        if($('.template-populated').length < 1) { // full server html not returned for this page or just navigated to same route (different chart) -- need backbone to render view template
            needsrerender = true;
            dispatcher.trigger('viewChange');
            $('body').removeClass("home").addClass("inner-page");
        }
        else {
            $('.template-populated').removeClass('template-populated');
        }

        var thismodel = new App.Chart(({slug: slug}));

        cleanUpCanvas();

        thismodel.fetch({
            success: function() {
                dbgconsolelog("Fetched charts");
                viewtoload = new App.ChartBareView({
                    model: thismodel,
                    needsrerender: needsrerender
                })
                //console.log(viewtoload.needsrerender);
                that.loadView(viewtoload);
                document.title = "Proper Channel - "+thismodel.get('title');
            }
        });

        currentUser.fetch();
        $('.at4-share-outer').show()
        lmv = App.LoginMenuView.getInstance({model: currentUser});

        //lmv = new App.LoginMenuView({model: currentUser});
        //cbv.render();
    },

    chartVersionViewRoute: function(slug, versionnumber) {
        dispatcher.trigger('viewChange');
        onviewpage = true;
        this.destroyMenuViews();
        this.destroyCollections();
        var that = this;
        var thismodel = new App.ChartRevision({slug: slug, version:versionnumber});
        $('body').removeClass("home").addClass("inner-page");

        cleanUpCanvas();

        thismodel.fetch({
            success: function() {
                dbgconsolelog("Fetched charts");
                that.loadView(new App.ChartVersionView({
                    model: thismodel
                }));
                document.title = "Proper Channel - "+thismodel.get('title')+" - Version "+thismodel.get('version');
            }
        });
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
    },

    chartEditRoute: function(slug) {
        dispatcher.trigger('viewChange');
        onviewpage = false;
        this.destroyMenuViews();
        var that = this;
        this.destroyCollections();
        var thismodel = new App.Chart(({slug: slug}));

        cleanUpCanvas();

        $('body').removeClass("home").addClass("inner-page");
        $('body').css('overflow', 'scroll');

        thismodel.fetch().done(function() {
            dbgconsolelog("Charts fetched");
            that.loadView(new App.ChartEditView({
                model: thismodel
            }));
            document.title = "Proper Channel - "+thismodel.get('title')+" - Edit";
            //that.runTagsInput();
        });
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        $('.at4-share-outer').hide()
        //lmv = new App.LoginMenuView({model: currentUser});
        //cev.render();
    },

    cloneRoute: function(slug) {
        dispatcher.trigger('viewChange');
        onviewpage = false;
        this.destroyMenuViews();
        var that = this;
        this.destroyCollections();
        var thismodel = new App.Chart(({slug: slug}));

        cleanUpCanvas();

        $('body').removeClass("home").addClass("inner-page");
        $('body').css('overflow', 'scroll');

        thismodel.fetch().done(function() {
            that.loadView(new App.ChartCloneView({
                model: thismodel
            }));
            document.title = "Proper Channel - "+thismodel.get('title')+" - Clone";
            $('.at4-share-outer').hide()
            //that.runTagsInput();
        });
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        //lmv = new App.LoginMenuView({model: currentUser});
        //cev.render();
    },

    cloneVersionRoute: function(slug, versionnumber) {
        dispatcher.trigger('viewChange');
        onviewpage = false;
        this.destroyMenuViews();
        var that = this;
        this.destroyCollections();
        var thismodel = new App.ChartRevision(({slug: slug, version: versionnumber}));
        $('body').removeClass("home").addClass("inner-page");

        cleanUpCanvas();

        thismodel.fetch().done(function() {
            that.loadView(new App.ChartCloneView({
                model: thismodel
            }));
            document.title = "Proper Channel - "+thismodel.get('title')+"- Version "+thismodel.get('version')+" - Clone";
            $('.at4-share-outer').hide()
            //that.runTagsInput();
        });
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        //lmv = new App.LoginMenuView({model: currentUser});
        //cev.render();
    },

    queryTagSearchRoute: function(query, tags) {
        dispatcher.trigger('viewChange');
        onviewpage = false;
        this.destroyMenuViews();
        this.destroyCollections();
        dbgconsolelog("Nav to search results");

        if (query) {
            // Parse URL friendly query (TODO: perhaps remove all special characters)
            query = query.trim().replace(/[-]/g, " ");
        }

        if (tags) {
            // Parse URL friendly tags
            tags = tags.trim().replace(/[-]/g, " ").split("+").map(function(e) { return e.trim(); });
        }

        this.loadView(new App.SearchListView( { query: query, tags: tags }));

        $('body').removeClass("home").addClass("inner-page");
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        document.title = "Proper Channel - Search Results";
        $('.at4-share-outer').hide()
        //lmv = new App.LoginMenuView({model: currentUser});
        cleanUpCanvas();
    },

    tagSearchRoute: function(tags) {
        dispatcher.trigger('viewChange');
        onviewpage = false;
        this.destroyMenuViews();
        this.destroyCollections();
        dbgconsolelog("Nav to search results");

        // Parse URL friendly tags
        tags = tags.trim().replace(/[-]/g, " ").split("+").map(function(e) { return e.trim(); });
        
        this.loadView(new App.SearchListView( { query: null, tags: tags }));

        $('body').removeClass("home").addClass("inner-page");
        currentUser.fetch();
        lmv = App.LoginMenuView.getInstance({model: currentUser});
        document.title = "Proper Channel - Search Results";
        $('.at4-share-outer').hide()
        //lmv = new App.LoginMenuView({model: currentUser});
        cleanUpCanvas();
    },

    profileRoute: function(username, profileSection) {
        dispatcher.trigger('viewChange');
        onviewpage = false;
        this.destroyMenuViews();
        this.destroyCollections();
        var self = this;
        var requestedProfile = new App.UserProfile({user_id: username});
        requestedProfile.fetch().done(function() {
            self.loadView(new App.UserProfileView({
                model: requestedProfile,
                profileSection: profileSection
            }));
            document.title = "Proper Channel - "+requestedProfile.get('username');
            $('.at4-share-outer').hide();
        });
        $('body').removeClass("home").addClass("inner-page");
        lmv = App.LoginMenuView.getInstance({model: currentUser});
    }
});

App.Chart = Backbone.Model.extend({
    defaults: {
        title: '',
        chartobj: 'None',
        created_at: 'Unknown',
        created_at_iso: 'Unknown',
        slug: '',
        imgurl: 'None',
        positive_votes: 0,
        negative_votes: 0,
        tags: []
    },

    urlRoot: '/api/chart/',

    url: function() {
        return this.urlRoot + this.get('slug');
    },

    toJSON: function() {
        return {
            chart: this.attributes
        };
    }
});

App.SearchChart = Backbone.Model.extend({
    defaults: {
        title: '',
        chartobj: 'None',
        created_at: 'Unknown',
        created_at_iso: 'Unknown',
        slug: '',
        imgurl: 'None',
        positive_votes: 0,
        negative_votes: 0,
        query_relevance_score: 0,
        tags: [],
        snippet_text: ''
    },

    urlRoot: '/api/chart/',

    url: function() {
        return this.urlRoot + this.get('slug');
    },

    toJSON: function() {
        return {
            chart: this.attributes
        };
    }
});

App.RevisionObject = Backbone.Model.extend({
    defaults: {
        'chart': 'None',
        'version': 0,
        'action': 'None',
        'created_iso': 'Unknown',
        'revised_by': 'Unknown',
        'view_link': 'None',
        'islatest': false
    },

    urlRoot: '/api/chart/',

    initialize: function() {
        this.makeEditLink();
    },

    url: function() {
        return this.urlRoot + this.get('chart') + '/revisionsummary/' + this.version;
    },

    makeEditLink: function() {
        if (this.get('islatest')) {
            this.set({view_link: protocolString+rootURL+'/chart/'+this.get('chart_id')});
        } else {
            this.set({view_link: protocolString+rootURL+'/chart/'+this.get('chart_id')+'/version/'+(this.get('version')+1)});
        }
        return this;
    },

    toJSON: function() {
        return {
            revisionobject: this.attributes
        }
    }
});

App.RevisionObjectCollection = Backbone.Collection.extend({
    initialize: function(options) {
        options || (options = {});
        this.chartslug = options.chartslug;
    },

    model: App.RevisionObject,

    url: function() { return '/api/chart/' + this.chartslug + '/revisionsummary'; },

    comparator: function(chartA, chartB) {
        var versionA = chartA.version;
        var versionB = chartB.version;
        if (versionA < versionB) return 1;
        if (versionB < versionA) return -1;
        return 0;
    },

    parse: function(response) {
        return response.revisionobjects;
    },

    setLatest: function() {
        this.maxversion = _.max(this.models, function(model) {
            return model.get('version');
        });
        this.maxversion.set({islatest: true});
        this.maxversion.makeEditLink();
    }
});

App.ChartRevision = Backbone.Model.extend({
    defaults: {
        title: '',
        chartobj: 'None',
        created_at: 'Unknown',
        created_at_iso: 'Unknown',
        slug: '',
        imgurl: 'None',
        positive_votes: 0,
        negative_votes: 0,
        tags: [],
        version: 0
    },

    urlRoot: '/api/chart/',

    url: function() {
        return this.urlRoot + this.get('slug') + '/revision/' + this.get('version');
    },

    toJSON: function() {
        return {
            chart: this.attributes
        };
    }
});

App.ChartRevisionsCollection = Backbone.Collection.extend({
    initialize: function(options) {
        options || (options = {});
        this.chartslug = options.chartslug;
    },

    model: App.ChartRevision,

    url: function() { return '/api/chart/' + this.chartslug + '/revisions'; },

    comparator: function(chartA, chartB) {
        var versionA = chartA.version;
        var versionB = chartB.version;
        if (versionA < versionB) return 1;
        if (versionB < versionA) return -1;
        return 0;
    },

    parse: function(response) {
        return response.revisions;
    }
});

App.ChartsCollection = Backbone.Collection.extend({
    model: App.SearchChart,
    url: '/api/charts',

    /*sortNewestEdit: function(chartA, chartB) {
        var chartADate = new Date(chartA.get('last_modified_at'));
        var chartBDate = new Date(chartB.get('last_modified_at'));
        return -(chartADate - chartBDate);
    },

    sortOldestEdit: function(chartA, chartB) {
        var chartADate = new Date(chartA.get('last_modified_at'));
        var chartBDate = new Date(chartB.get('last_modified_at'));
        return chartADate - chartBDate;
    },

    sortNewest: function(chartA, chartB) {
        var chartADate = new Date(chartA.get('created_iso'));
        var chartBDate = new Date(chartB.get('created_iso'));
        return -(chartADate - chartBDate);
    },

    sortOldest: function(chartA, chartB) {
        var chartADate = new Date(chartA.get('created_iso'));
        var chartBDate = new Date(chartB.get('created_iso'));
        return chartADate - chartBDate;
    },*/

    sortNewestEdit: function(chartA) {
        var chartADate = new Date(chartA.get('last_modified_at'));

        return -chartADate.getTime();
    },

    sortOldestEdit: function(chartA) {
        var chartADate = new Date(chartA.get('last_modified_at'));

        return chartADate.getTime();
    },

    sortNewest: function(chartA) {
        var chartADate = new Date(chartA.get('created_iso'));

        return -chartADate.getTime();
    },

    sortOldest: function(chartA) {
        var chartADate = new Date(chartA.get('created_iso'));

        return chartADate.getTime();
    },

    sortVoteHigh: function(chart) {
        return -(chart.get("positive_votes") - chart.get("negative_votes"));
    },

    sortVoteLow: function(chart) {
        return chart.get("positive_votes") - chart.get("negative_votes");
    },

    sortAtoZ: function(chartA, chartB) {
        return chartA.get("title").localeCompare(chartB.get("title"));
    },

    sortZtoA: function(chartA, chartB) {
        return -(chartA.get("title").localeCompare(chartB.get("title")));
    },

    sortRelevance: function(chartA) {
        var chartAScore = chartA.get('query_relevance_score');

        return -chartAScore;
    },

    sortViewcount: function(chartA) {
        return chartA.get('viewcount');
    },

    changeComparator: function(type) {
        switch(type) {
            case 'viewcount':
                this.comparator = this.sortViewcount;
                break;
            case 'relevance':
                this.comparator = this.sortRelevance;
                break;
            case 'editnew':
                this.comparator = this.sortNewestEdit;
                break;
            case 'editold':
                this.comparator = this.sortOldestEdit;
                break;
            case 'newest':
                this.comparator = this.sortNewest;
                break;
            case 'oldest':
                this.comparator = this.sortOldest;
                break;
            case 'atoz':
                this.comparator = this.sortAtoZ;
                break;
            case 'ztoa':
                this.comparator = this.sortZtoA;
                break;
            case 'voteHigh':
                this.comparator = this.sortVoteHigh;
                break;
            case 'voteLow':
                this.comparator = this.sortVoteLow;
                break;
        }
    },

    /*comparator: function(chartA, chartB) {
        var chartADate = new Date(chartA.get('created_iso'));
        var chartBDate = new Date(chartB.get('created_iso'));
        //dbgconsolelog(commentADate);
        //dbgconsolelog(commentBDate);
        if (chartADate < chartBDate) return 1;
        if (chartBDate < chartADate) return -1;
        return 0;
    },*/

    initialize: function(opts) {
        this.comparator = this.sortNewestEdit;
    },

    parse: function(response) {
        return response.charts;
    }
});

/*App.LastChartsCollection = Backbone.Collection.extend({
    initialize: function(options) {
        options || (options = {});
        this.numToReturn = options.numToReturn;
    },
    model: App.SearchChart,
    url: function() { return '/api/charts/latest/' + this.numToReturn; },
    comparator: function(chartA, chartB) {
        var chartADate = new Date(chartA.get('created_iso'));
        var chartBDate = new Date(chartB.get('created_iso'));
        if (chartADate < chartBDate) return 1;
        if (chartBDate < chartADate) return -1;
        return 0;
    },
    parse: function(response) {
        return response.charts;
    }
});

App.MostViewedCollection = Backbone.Collection.extend({
    initialize: function(options) {
        options || (options = {});
        this.numToReturn = options.numToReturn;
    },
    model: App.SearchChart,
    url: function() { return '/api/charts/mostviewed/' + this.numToReturn; },
    comparator: function(chartA, chartB) {
        var chartAViews = chartA.get('viewcount');
        var chartBViews = chartB.get('viewcount');
        if (chartAViews < chartBViews) return 1;
        if (chartBViews < chartAViews) return -1;
        return 0;
    },
    parse: function(response) {
        return response.charts;
    }
});*/

App.HighestScoringCollection = Backbone.Collection.extend({
    initialize: function(options) {
        options || (options = {});
        this.numToReturn = options.numToReturn;
    },
    model: App.SearchChart,
    url: function() { return '/api/charts/highestscoring/' + this.numToReturn; },
    comparator: function(chartA, chartB) {
        var chartAScore = chartA.get('positive_votes') - chartA.get('negative_votes');
        var chartBScore = chartB.get('positive_votes') - chartB.get('negative_votes');
        if (chartAScore < chartBScore) return 1;
        if (chartBScore < chartAScore) return -1;
        return 0;
    },
    parse: function(response) {
        return response.charts;
    }
});

/*App.SearchChartsCollection = Backbone.Collection.extend({
    initialize: function(options) {
        options || (options = {});
        this.querystring = options.querystring;
    },

    model: App.Chart,
    url: function() {
        return "/api/search?"+this.querystring;
    },

    comparator: function(chartA, chartB) {
        var chartAScore = chartA.get('query_relevance_score');
        var chartBScore = chartB.get('query_relevance_score');
        //dbgconsolelog(commentADate);
        //dbgconsolelog(commentBDate);
        if (chartAScore < chartBScore) return 1;
        if (chartBScore < chartAScore) return -1;
        return 0;
    },
    parse: function(response) {
        return response.charts;
    }
});*/

App.SearchChartsCollection = App.ChartsCollection.extend({
    initialize: function(options) {
        options || (options = {});
        this.comparator = this.sortRelevance;
        this.querystring = options.querystring;
    },

    url: function() {
        return "/api/search?"+this.querystring;
    }
});

App.Comment = Backbone.Model.extend({
    defaults: {
        id: '',
        author: '',
        body: '',
        created_at: '',
        chart: ''
    },

    urlRoot: '/api/chart/',

    url: function() {
        return this.urlRoot + this.get('chart') + '/comment/' + this.get('id');
    },

    toJSON: function() {
        return {
            chart: this.attributes
        };
    }
});

App.CommentsCollection = Backbone.Collection.extend({
    model: App.Comment,
    initialize: function(models, options) {
        this.chartslug = options.chartslug;
        return this;
    },
    urlRoot: '/api/chart/',
    url: function() {
        dbgconsolelog("Slug passed was "+this.chartslug);
        return this.urlRoot + this.chartslug + '/comments'
    },
    comparator: function(commentA, commentB) {
        var commentADate = new Date(commentA.get('created_iso'));
        var commentBDate = new Date(commentB.get('created_iso'));
        //dbgconsolelog(commentADate);
        //dbgconsolelog(commentBDate);
        if (commentADate < commentBDate) return -1;
        if (commentBDate < commentADate) return 1;
        return 0;
    },
    parse: function(response) {
        return response.comments;
    }
});



App.Shape = Backbone.Model.extend({
    defaults: {
        id: '',
        typename: 'none'
    },

    initialize: function() {
        //dbgconsolelog('Created shape with id: ' + this.id + ' and typename: ' + this.typename);
    },

    toJSON: function() {
        return {
            shape: this.attributes
        }
    },

    toString: function() {
        return ("type: " + this.typename + ", id: " + this.id);
    }
});

App.ShapeCollection = Backbone.Collection.extend({
    model: App.Shape,

    localStorage: new Backbone.LocalStorage('shapecollection'),

    destroyAll: function() {
        while ((themodel = this.shift())) {
            themodel.collection = this;
            //dbgconsolelog("Destroying " + themodel.toString());
            //dbgconsolelog(themodel.collection);
            themodel.destroy();
        }
        this.unbind();
    }
});

App.Arrow = Backbone.Model.extend({
    defaults: {
        id: ''
    },

    initialize: function() {
        //dbgconsolelog('Created arrow with id: ' + this.id);
    },

    toJSON: function() {
        return {
            arrow: this.attributes
        }
    }
});

App.ArrowCollection = Backbone.Collection.extend({
    model: App.Arrow,

    localStorage: new Backbone.LocalStorage('arrowcollection'),

    destroyAll: function() {
        while ((themodel = this.shift())) {
            themodel.collection = this;
            //dbgconsolelog(themodel);
            //dbgconsolelog(themodel.collection);
            themodel.destroy();
        }
        this.unbind();
    }
});

App.User = Backbone.Model.extend({
    idAttribute: 'user_id',
    url: '/api/user'
});

App.UserProfile = Backbone.Model.extend({
    idAttribute: 'user_id',
    defaults: {
        user_id: ''
    },

    urlRoot: '/api/user/',

    url: function() {
        return this.urlRoot + this.get('user_id');
    }
});

App.UserProfileCollection = Backbone.Collection.extend({
    model: App.UserProfile
});

var user_profile_collection = new App.UserProfileCollection();

App.UserCharts = App.ChartsCollection.extend({
    initialize: function(options) {
        this.user_id = options.user_id;
        this.count = options.count || '';
        this.comparator = this.sortNewest;
        return this;
    },

    urlRoot: '/api/user/',

    url: function() {
        return this.urlRoot + this.user_id + this.profilePart + this.count;
    }
});

App.UserCreatedCharts = App.UserCharts.extend({

    profilePart: '/created/',

    parse: function(response) {
        return response.created_charts;
    }
});

App.UserSavedCharts = App.UserCharts.extend({

    profilePart: '/favorites/',

    parse: function(response) {
        return response.favorite_charts;
    }
});

App.LastChartsCollection = App.ChartsCollection.extend({
    initialize: function(options) {
        options || (options = {});
        this.numToReturn = options.numToReturn;
        this.comparator = this.sortNewest;
    },

    urlRoot: '/api/charts/latest/',

    url: function() { return this.urlRoot + this.numToReturn; },

    parse: function(response) {
        return response.charts;
    }
});

App.MostViewedCollection = App.ChartsCollection.extend({
    initialize: function(options) {
        options || (options = {});
        this.numToReturn = options.numToReturn;
        this.comparator = this.sortViewcount;
    },

    urlRoot: '/api/charts/mostviewed/',

    url: function() { return this.urlRoot + this.numToReturn; },

    parse: function(response) {
        return response.charts;
    }
});

App.UserFollowDetails = Backbone.Model.extend({
    defaults: {
        user_id: ''
    },

    url: function() {
        return '/api/user/' + this.get('user_id') + '/followers/';
    }
});

App.FollowView = Backbone.View.extend({

    render: function() {
        this.$el.html(this.template(this.model));
        return this;
    },

    template: _.template('' +
                '<div class="follow-item col-xs-6 col-sm-4 col-md-4 col-lg-4">' +
                    //'<div class="follow-item-pic-wrapper">' +
                        '<a class="follow-item-pic" style="background-image: url(\'<%= profile_image_url %>\');" href="/profile/<%= username %>">' +
                        '</a>' +
                    //'</div>' +
                    '<div class="follow-item-info-wrapper">' +
                        '<a class="follow-item-name vertical-align-wrapper" href="/profile/<%= username %>">' +
                            '<span class="vertical-middle"><%= username %></span>' +
                        '</a>' +
                        '<a class="follow-item-rating vertical-align-wrapper <% if ((upvotes_received - downvotes_received) >= 0) { %>positive<% } else { %>negative<% } %>" href="/profile/<%= username %>">' +
                            '<span class="vertical-middle"><% if ((upvotes_received - downvotes_received) > 0) { %>+<% } %><%= upvotes_received - downvotes_received %></span>' +
                        '</a>' +
                    '</div>' +
                '</div>')

    /*template: _.template('' +
                '<div class="follow-item col-xs-6 col-sm-4 col-md-3 col-lg-2">' +
                    '<a href="/profile/<%= username %>">' +
                        '<div class="follow-item-pic" style="background-image: url(\'<%= profile_image_url %>\');"></div>' +
                        '<span class="follow-item-name"><%= username %></span>' +
                    '</a>' +
                '</div>')*/
});

var shapecollection = new App.ShapeCollection();
var arrowcollection = new App.ArrowCollection();

var charts = new App.ChartsCollection();

var currentUser = new App.User();

App.IndexView = Backbone.View.extend({
    el: '#appviewcontent',

    events: {
        'click #home-search-button': 'getSearchResults',
        'click #section-search-button': 'getSearchResults',
        'keypress #home-search-field': 'getSearchResultsOnEnter',
        'keypress #section-search-field': 'getSearchResultsOnEnter'
    },

    template: _.template(''+
        '<section class="home-section call-to-action green-bckg text-white">' +
            '<div class="container">' +
                '<div id="home-header" class="row">' +
                    '<div class="col-xs-12 col-md-7 text-center">' +
                        '<h1>THE EASIEST INSTRUCTIONS IN THE WORLD</h1>' +
                        '<h4>Easy to create. Easy to share. Easy to use.<br><br>It\'s not just about putting together your furniture. It\'s about fixing your privacy settings on Facebook, getting your child to go to bed on time, and signing up for healthcare. All our guides are written by real people who\'ve already figured it out, and are willing to share their experience with you. Life is easy when you have instructions.<br><br>Go ahead:</h4>' +
                        '<div id="home-search-wrapper">' +
                            '<form id="home-search-form">' +
                                '<input id="home-search-field" class="search-field" placeholder="Learn something new today!" type="text">' +
                                '<button id="home-search-button" class="search-button glyphicon glyphicon-search"></button>' +
                            '</form>' +
                        '</div>' +
                        '<h4>OR</h4>' +
                        '<h3><a href="/new" id="banner-cta" class="pc-btn blue filled">Show us how to get things done!</a></h3>' +
                    '</div>' +
                    '<div class="hidden-xs hidden-sm col-md-5">' +
                        '<video class="border-complement" poster="/static/omfiles/images/use-chart.png" autoplay>' +
                            '<source src="https://s3.amazonaws.com/properchannel-shapes/use-chart.mp4" type="video/mp4">' +
                        '</video>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        //'<h5>Are you in <a href="#">Boston</a>, <a href="#">MA</a>, <a href="#">USA</a>? &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <a class="advance" href="#">Advanced Search</a></h5>' +
        '</section>'+
        '<section class="home-section blue-bckg">' +
            '<div class="container">' +
                '<div class="section-title row text-pc-green">' +
                    '<div class="col-xs-12 text-center"><h2>CREATE</h2></div>' +
                '</div>' +
                '<div class="section-subtitle row text-white">' +
                    '<div class="col-xs-12 text-center"><h3>Making new guides is as easy as 1-2-3</h3></div>' +
                '</div>' +
                '<div class="section-content row text-pc-green">' +
                    '<div class="col-xs-12 col-md-6 col-lg-5 height-100">' +
                        '<div class="content-frame grey-bckg">' +
                            '<div class="framed-content three-item">' +
                                '<div class="row top">' +
                                    '<div class="col-xs-3 content-badge text-center vertical-align-wrapper">' +
                                        '<div class="vertical-middle">' +
                                            '<div class="content-icon"><span class="glyphicon glyphicon-edit"></span></div>' +
                                            '<div class="content-name">BUILD IT</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-xs-9 text-center vertical-align-wrapper">' +
                                        '<span class="content-detail vertical-middle">Drag and drop shapes onto the canvas</span>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="row">' +
                                    '<div class="col-xs-3 content-badge text-center vertical-align-wrapper">' +
                                        '<div class="vertical-middle">' +
                                            '<div class="content-icon"><span class="glyphicon glyphicon-list"></span></div>' +
                                            '<div class="content-name">LABEL IT</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-xs-9 text-center vertical-align-wrapper">' +
                                        '<span class="content-detail vertical-middle">Label the shapes and add details including images and video</span>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="row bottom">' +
                                    '<div class="col-xs-3 content-badge text-center vertical-align-wrapper">' +
                                        '<div class="vertical-middle">' +
                                            '<div class="content-icon"><span class="glyphicon glyphicon-share-alt"></span></div>' +
                                            '<div class="content-name">SHARE IT</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-xs-9 text-center vertical-align-wrapper">' +
                                        '<span class="content-detail vertical-middle">Tag your chart so others can find it and share it directly through social networks</span>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="hidden-xs hidden-sm col-md-6 col-lg-5 col-lg-offset-2 height-100">' +
                        '<img class="border-complement" alt="Editing a chart" src="/static/omfiles/images/edit-chart.png">' +
                    '</div>' +
                '</div>' +
                '<div class="section-footer row">' +
                    '<div class="col-xs-8 col-xs-offset-2 col-md-4 col-md-offset-4">' +
                        '<h3><a href="/new" alt="Create a Flowchart!" class="pc-btn green expand text-center filled">GET STARTED</a></h3>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</section>' +
        '<section class="home-section white-bckg">' +
            '<div class="container">' +
                '<div class="section-title row text-pc-green">' +
                    '<div class="col-xs-12 text-center"><h2>LEARN</h2></div>' +
                '</div>' +
                '<div class="section-subtitle row text-pc-blue">' +
                    '<div class="col-xs-12 text-center"><h3>Find answers to your questions in three different ways</h3></div>' +
                '</div>' +
                '<div class="section-content row text-pc-green">' +
                    '<div class="col-xs-12 col-md-6 col-lg-5 height-100">' +
                        '<div class="content-frame grey-bckg">' +
                            '<div class="framed-content three-item">' +
                                '<div class="row top">' +
                                    '<div class="col-xs-3 content-badge text-center vertical-align-wrapper">' +
                                        '<div class="vertical-middle">' +
                                            '<div class="content-icon"><span class="glyphicon glyphicon-search"></span></div>' +
                                            '<div class="content-name">SEARCH</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-xs-9 text-center vertical-align-wrapper">' +
                                        '<span class="content-detail vertical-middle">Search using keywords and tags</span>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="row">' +
                                    '<div class="col-xs-3 content-badge text-center vertical-align-wrapper">' +
                                        '<div class="vertical-middle">' +
                                            '<div class="content-icon"><span class="glyphicon glyphicon-th"></span></div>' +
                                            '<div class="content-name">BROWSE</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-xs-9 text-center vertical-align-wrapper">' +
                                        '<span class="content-detail vertical-middle">Sort by success rating, recency, and title</span>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="row bottom">' +
                                    '<div class="col-xs-3 content-badge text-center vertical-align-wrapper">' +
                                        '<div class="vertical-middle">' +
                                            '<div class="content-icon"><span class="glyphicon glyphicon-user"></span></div>' +
                                            '<div class="content-name">COMMUNITIES</div>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-xs-9 text-center vertical-align-wrapper">' +
                                        '<span class="content-detail vertical-middle">Search and browse through curated collections of related content<br>(Coming Soon)</span>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="hidden-xs hidden-sm col-md-6 col-lg-5 col-lg-offset-2 height-100">' +
                        '<img class="border-complement" alt="Editing a chart" src="/static/omfiles/images/search-chart.png">' +
                    '</div>' +
                '</div>' +
                '<div class="section-footer row">' +
                    '<div class="col-xs-8 col-xs-offset-2 col-md-4 col-md-offset-2">' +
                        '<div id="section-search-wrapper">' +
                            '<form id="section-search-form">' +
                                '<input id="section-search-field" class="search-field" placeholder="SEARCH" type="text">' +
                                '<button id="section-search-button" class="search-button glyphicon glyphicon-search"></button>' +
                            '</form>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-xs-8 col-xs-offset-2 xs-margin-top sm-margin-top col-md-4 col-md-offset-0">' +
                        '<h3><a href="/search" alt="Create a Flowchart!" class="pc-btn green expand text-center filled">BROWSE ALL</a></h3>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</section>' +
        '<section class="home-section grey-bckg">'+
            '<div class="container">' +
                '<div class="section-title row text-pc-blue">' +
                    '<div class="col-xs-12 text-center"><h2>MOST POPULAR GUIDES</h2></div>' +
                '</div>' +
                '<div class="row">' +
                    '<div id="landing-charts" class="col-xs-12"></div>'+
                '</div>' +
            '</div>'+
        '</section>' +
        '<section class="home-section white-bckg">'+
            '<div class="container">' +
                '<div class="section-title row text-pc-green">' +
                    '<div class="col-xs-12 text-center"><h2>FEATURED USERS</h2></div>' +
                '</div>' +
                '<div class="section-content section-expandable row text-white">' +
                    '<div class="col-xs-12 col-md-4 col-lg-4 featured-user">' +
                        '<div class="content-frame green-bckg">' +
                            '<div class="framed-content large-border">' +
                                '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/kids.jpg\');">' +
                                '</div>' +
                                '<div class="featured-user-name text-pc-blue text-center">' +
                                    '<h3>Kids Inc.</h3>' +
                                '</div>' +
                                '<div class="featured-user-quote vertical-align-wrapper">' +
                                    '<span class="vertical-middle">If the ways in which the community can contribute are surrounded by ambiguity or bureaucratic hurdles the kids and organization suffer.</span>' +
                                '</div>' +
                                '<div class="featured-user-button vertical-align-wrapper text-center">' +
                                    '<h3><a target="_blank" href="http://blog.properchannel.co/2015/02/kids-inc-uses-proper-channel-to-hack-beuracracy/" class="pc-btn blue filled">Read More</a></h3>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-xs-12 col-md-4 col-lg-4 featured-user xs-margin-top sm-margin-top">' +
                        '<div class="content-frame green-bckg">' +
                            '<div class="framed-content large-border">' +
                                '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/domi.png\');">' +
                                '</div>' +
                                '<div class="featured-user-name text-pc-blue text-center">' +
                                    '<h3>Domi Station</h3>' +
                                '</div>' +
                                '<div class="featured-user-quote vertical-align-wrapper">' +
                                    '<span class="vertical-middle">The Community Manager at Domi has been using Proper Channel to help communicate information to over 100 different community members.</span>' +
                                '</div>' +
                                '<div class="featured-user-button vertical-align-wrapper text-center">' +
                                    '<h3><a target="_blank" href="http://blog.properchannel.co/2015/02/domi-station/" class="pc-btn blue filled">Read More</a></h3>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-xs-12 col-md-4 col-lg-4 featured-user xs-margin-top sm-margin-top">' +
                        '<div class="content-frame green-bckg">' +
                            '<div class="framed-content large-border">' +
                                '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/career-source.jpg\');">' +
                                '</div>' +
                                '<div class="featured-user-name text-pc-blue text-center">' +
                                    '<h3>Career Source</h3>' +
                                '</div>' +
                                '<div class="featured-user-quote vertical-align-wrapper">' +
                                    '<span class="vertical-middle">Proper Channel allows senior management to put new processes in place for prototyping and testing.</span>' +
                                '</div>' +
                                '<div class="featured-user-button vertical-align-wrapper text-center">' +
                                    '<h3><a target="_blank" href="http://blog.properchannel.co/2015/11/e-month-featured-user-jim-mcshane-ceo-of-career-source/" class="pc-btn blue filled">Read More</a></h3>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="section-footer row">' +
                    '<div class="col-xs-8 col-xs-offset-2 col-md-4 col-md-offset-4">' +
                        '<h3><a target="_blank" href="http://blog.properchannel.co/category/featured-user/" alt="More Featured Users" class="pc-btn green expand text-center filled">VIEW ALL</a></h3>' +
                    '</div>' +
                '</div>' +
            '</div>'+
        '</section>' +
        '<section class="home-section blue-bckg">' +
            '<div class="container">' +
                '<div class="section-title row text-pc-green">' +
                    '<div class="col-xs-12 text-center"><h2>BECOME A MEMBER</h2></div>' +
                '</div>' +
                '<div class="section-subtitle row text-white">' +
                    '<div class="col-xs-12 text-center"><h3>Get more from Proper Channel by becoming a registered member</h3></div>' +
                '</div>' +
                '<div class="section-content section-expandable row text-white">' +
                    '<div class="col-xs-12 col-md-4 col-lg-4 text-center">' +
                        '<div class="perk-icon">' +
                            '<span class="fa fa-bar-chart"></span>' +
                        '</div>' +
                        '<div class="perk-name">' +
                            '<h3>Make an Impact</h3>' +
                        '</div>' +
                        '<div class="perk-detail">' +
                            '<h4>Track your contributions to Proper Channel</h4>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-xs-12 col-md-4 col-lg-4 xs-margin-top sm-margin-top text-center">' +
                        '<div class="perk-icon">' +
                            '<span class="fa fa-users"></span>' +
                        '</div>' +
                        '<div class="perk-name">' +
                            '<h3>Get Social</h3>' +
                        '</div>' +
                        '<div class="perk-detail">' +
                            '<h4>Follow other users and join communities</h4>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-xs-12 col-md-4 col-lg-4 xs-margin-top sm-margin-top text-center">' +
                        '<div class="perk-icon">' +
                            '<span class="fa fa-exclamation-circle"></span>' +
                        '</div>' +
                        '<div class="perk-name">' +
                            '<h3>Stay Connected</h3>' +
                        '</div>' +
                        '<div class="perk-detail">' +
                            '<h4>Get notified about new content by your favorite members and communities<br>(Coming Soon)</h4>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="section-footer row">' +
                    '<div class="col-xs-8 col-xs-offset-2 col-md-4 col-md-offset-4">' +
                        '<h3><a href="/register" alt="Become a member" class="pc-btn green expand text-center filled">CREATE AN ACCOUNT</a></h3>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</section>'
        ),

    initialize: function() {
        var self = this;
        dbgconsolelog("Initializing Index View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }
        if ($('.home-section').length) {

            var chartCollectionView = new App.ChartScrollView({
                el: '#landing-charts'
            });

            $(document).ready(function(){   
                $(function() {
                    $('#home-search-form, #section-search-form').submit(function(e) {
                        e.preventDefault();
                        //$('#home-search-button, #section-search-button').click();
                        $(this).find('.search-button').get(0).click();
                    });
                });

                // Add Result Suggestion to search field
                $('#home-search-field, #section-search-field').devbridgeAutocomplete({
                    serviceUrl: '/api/suggest',
                    minChars: 2,
                    deferRequestBy: 100,
                    dataType: 'json',
                    onSelect: function(suggestion) {
                        router.navigate("chart/"+suggestion.data.slug, {trigger: true});  
                    },
                    transformResult: function(response) {
                        return {
                            suggestions: $.map(response.charts, function(dataItem) {
                                return { value: dataItem.title, data: dataItem };
                            })
                        };
                    },
                    formatResult: function(suggestion, currentValue){
                        var posneg = (suggestion.data.positive_votes-suggestion.data.negative_votes) >= 0 ? 'positive' : 'negative';
                        return  '<div class="suggestion-sample-wrapper">'+
                                    '<div class="suggestion-sample-info">'+
                                        '<div class="suggestion-sample-title text-center vertical-align-wrapper '+posneg+'">'+
                                            '<span class="vertical-middle">'+suggestion.value+'</span>'+
                                        '</div>'+
                                        '<div class="suggestion-sample-success text-center vertical-align-wrapper '+posneg+'">'+
                                            '<span class="vertical-middle">'+(suggestion.data.positive_votes-suggestion.data.negative_votes)+'</span>'+
                                        '</div>'+
                                    '</div>' +
                                '</div>';
                    }
                });
            });

            dispatcher.trigger('renderEvent');
        }
        else {
            this.render();
        }

        if ($('.logo-section').css('display') == 'none') {
            $('.logo-section').show();
        }
    },

    render: function() {
        dbgconsolelog("Rendering Index View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }

        var that = this;

        that.$el.html(that.template({
                arrowurl: 'static/omfiles/images/search-arrow-right.png',
            }));


        dispatcher.trigger('renderEvent');

        var mostViewed8 = new App.MostViewedCollection({numToReturn: 8});

        var chartCollectionView = new App.ChartScrollView({
            chartContainer: '#landing-charts',
            chartCollection: mostViewed8,
            showSort: false,
            chartSampleType: 'profile',
            /*renderParent: function() {
                that.$el.html(that.template({
                    arrowurl: 'static/omfiles/images/search-arrow-right.png',
                }));
            },*/
            afterPopulate: function() {
                $(document).ready(function(){
                    $(function() {
                        $('#home-search-form, #section-search-form').submit(function(e) {
                            e.preventDefault();
                            //$('#home-search-button, #section-search-button').click();
                            $(this).find('.search-button').get(0).click();
                        });
                    });

                    // Add Result Suggestion to search field
                    $('#home-search-field, #section-search-field').devbridgeAutocomplete({
                        serviceUrl: '/api/suggest',
                        minChars: 2,
                        deferRequestBy: 100,
                        dataType: 'json',
                        onSelect: function(suggestion) {
                            router.navigate("chart/"+suggestion.data.slug, {trigger: true});  
                        },
                        transformResult: function(response) {
                            return {
                                suggestions: $.map(response.charts, function(dataItem) {
                                    return { value: dataItem.title, data: dataItem };
                                })
                            };
                        },
                        formatResult: function(suggestion, currentValue){
                            var posneg = (suggestion.data.positive_votes-suggestion.data.negative_votes) >= 0 ? 'positive' : 'negative';
                            return  '<div class="suggestion-sample-wrapper">'+
                                        '<div class="suggestion-sample-info">'+
                                            '<div class="suggestion-sample-title text-center vertical-align-wrapper '+posneg+'">'+
                                                '<span class="vertical-middle">'+suggestion.value+'</span>'+
                                            '</div>'+
                                            '<div class="suggestion-sample-success text-center vertical-align-wrapper '+posneg+'">'+
                                                '<span class="vertical-middle">'+(suggestion.data.positive_votes-suggestion.data.negative_votes)+'</span>'+
                                            '</div>'+
                                        '</div>' +
                                    '</div>';
                        }
                    });
                });
            }
        });
        chartCollectionView.render();
        return this;
    },

    getSearchResults: function(ev, field) {
        ev.preventDefault();
        field = field || $(ev.currentTarget).siblings('.search-field').get(0);
        dbgconsolelog("Clicked search! Text to search for was: " + $(field).val());
        
        var query = {query: $(field).val()};
        var parsedQuery = parseSearchQuery(query.query);

        var queryPath = "";
        queryPath += parsedQuery['query'] ? "/query/"+parsedQuery['query'] : "";
        queryPath += parsedQuery['tags'] ? "/tags/"+parsedQuery['tags'] : "";

        router.navigate("search"+queryPath, {trigger: true});
    },

    getSearchResultsOnEnter: function(ev) {
        if(ev.which === 13) {
            $(ev.currentTarget).blur();
            this.getSearchResults(e, ev.currentTarget);
        }
    }
});

App.AboutView = Backbone.View.extend({
    el: "#appviewcontent",
/********************************************************JENNA LOOK HERE*********************************************/
    template: _.template(''+
        '<section class="middle-panel clearfix">'+
  '<div class="container">'+
    '<header class="blue">Mission</header>' +
    '<h2>Allow people to achieve the change they desire.</h2>'+
    '<p>People are tormented by bureaucracy. It permeates all aspects of life, and prevents us from achieving our goals. It is often cited as the largest barrier to business, and personal growth. Why? The existing tools to guide us through the bureaucratic process are confusing, out of date, and incomplete. This frustrates users who are simply searching for clear steps through another of life\'s daily challenges.</p>'+
    '<p>Proper Channel has developed a web application that will allow people to easily collaborate on finding the most efficient way to navigate bureaucracy.  By documenting paths to success, we hope to remove barriers to change, and level the playing field between those who can afford to hire experts and those who can\'t.<br>'+
      '</p>'+
    
    '<div class="team-box">'+
        '<header class="blue">Team</header>' +
            '<div class="section-content section-expandable row text-white">' +
        '<div class="col-xs-12 col-md-4 col-lg-4 featured-user">' +
            '<div class="content-frame green-bckg">' +
                '<div class="framed-content large-border">' +
                    '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/William-square2.jpg\');">' +
                    '</div>' +
                    '<div class="featured-user-name text-pc-blue text-center">' +
                        '<h3>William McCluskey</h3>' +
                        '</div>' +
                        '<div class="featured-user-quote vertical-align-wrapper">' +
                            '<span class="vertical-middle">Will understands how bureaucracy can hold people back. Will\'s effort to improve his environment and community has left him swimming in bureaucracy time and time again. This motivated him to find a way to make all processes simpler and more transparent. Will has a B.S. in Civil Engineering from Florida State University and Florida A&M University and an MBA from Boston College.</span>' +
                        '</div>' +
                        '<div class="featured-user-button vertical-align-wrapper text-center">' +
                            '<h3><a class="pc-btn blue filled">CEO</a></h3>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="col-xs-12 col-md-4 col-lg-4 featured-user xs-margin-top sm-margin-top">' +
                '<div class="content-frame green-bckg">' +
                    '<div class="framed-content large-border">' +
                        '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/Roberto-Square2.jpg\');">' +
                        '</div>' +
                        '<div class="featured-user-name text-pc-blue text-center">' +
                            '<h3>Roberto Cuba Rocha</h3>' +
                        '</div>' +
                        '<div class="featured-user-quote vertical-align-wrapper">' +
                            '<span class="vertical-middle">Roberto understands learning curves. Roberto\'s has seen difficulties in employee training and knowledge transfer hold back great ideas at both large and small companies. Roberto recieved his BS in computer science from George Washington University.</span>' +
                        '</div>' +
                        '<div class="featured-user-button vertical-align-wrapper text-center">' +
                            '<h3><a class="pc-btn blue filled">Lead Developer</a></h3>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="col-xs-12 col-md-4 col-lg-4 featured-user xs-margin-top sm-margin-top">' +
                '<div class="content-frame green-bckg">' +
                    '<div class="framed-content large-border">' +
                        '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/Carolyn-square2.jpg\');">' +
                        '</div>' +
                        '<div class="featured-user-name text-pc-blue text-center">' +
                            '<h3>Carolyn Reoyo</h3>' +
                        '</div>' +
                        '<div class="featured-user-quote vertical-align-wrapper">' +
                            '<span class="vertical-middle">Carolyn believes that visualized instructions can help bridge communication gaps. As a Pharmacy Technician at Walgreens, she understands that conveying information clearly is important. Carolyn is a senior at Florida State University, double-majoring in Religion and Information Technology</span>' +
                        '</div>' +
                        '<div class="featured-user-button vertical-align-wrapper text-center">' +
                            '<h3><a class="pc-btn blue filled">Developer</a></h3>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>'+
    '<div class="team-box">'+
        '<header class="blue">Development Interns</header>' +
    '<div class="section-content section-expandable row text-white">' +
            '<div class="col-xs-12 col-md-4 col-lg-4 featured-user">' +
                '<div class="content-frame green-bckg">' +
                    '<div class="framed-content large-border">' +
                        '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/Celine-Square.jpg\');">' +
                        '</div>' +
                        '<div class="featured-user-name text-pc-blue text-center">' +
                            '<h3>Celina Nagales</h3>' +
                            '</div>' +
                            '<div class="featured-user-quote vertical-align-wrapper">' +
                                '<span class="vertical-middle">Proper Channel is going to cut the frustration from scrolling down search engines and never finding the entire solution. As a previous marketing intern for Proper Channel, Celina saw firsthand the help that it provided to nonprofit organizations.  Celina is a computational science major at FSU looking to work in Computational Forensics.</span>' +
                            '</div>' +
                            '<div class="featured-user-button vertical-align-wrapper text-center">' +
                                '<h3><a class="pc-btn blue filled">Intern</a></h3>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="col-xs-12 col-md-4 col-lg-4 featured-user xs-margin-top sm-margin-top">' +
                    '<div class="content-frame green-bckg">' +
                        '<div class="framed-content large-border">' +
                            '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/Jenna-Square2.jpg\');">' +
                            '</div>' +
                            '<div class="featured-user-name text-pc-blue text-center">' +
                                '<h3>Jenna Fishman</h3>' +
                            '</div>' +
                            '<div class="featured-user-quote vertical-align-wrapper">' +
                                '<span class="vertical-middle">Jenna sees Proper Channel as a method of connecting people and their ideas in a collaborative way while allowing freedom of networking and creating without the fears of restraint. As a student who believes that connecting with others benefits a community, she understands that connecting thoughts and experiences with those of similar passion or interest leads to positive innovation. Jenna is a junior at Florida State University majoring in Information, Communication, and Technology.</span>' +
                            '</div>' +
                            '<div class="featured-user-button vertical-align-wrapper text-center">' +
                                '<h3><a class="pc-btn blue filled">Intern</a></h3>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>'+
    '</div>'+
    '<div class="team-box">'+
        '<header class="blue">Growth Interns</header>' +
    '<div class="section-content section-expandable row text-white">' +
            '<div class="col-xs-12 col-md-4 col-lg-4 featured-user">' +
                '<div class="content-frame green-bckg">' +
                    '<div class="framed-content large-border">' +
                        '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/Maggie-Square.jpg\');">' +
                        '</div>' +
                        '<div class="featured-user-name text-pc-blue text-center">' +
                            '<h3>Maggie Seketa</h3>' +
                            '</div>' +
                            '<div class="featured-user-quote vertical-align-wrapper">' +
                                '<span class="vertical-middle">Maggie believes in giving people the tools to solve problems and make decisions. As a graduate assistant working with student interns, she understands the importance of encouraging creativity and not limiting growth and motivation. Maggie has a B.A. in Studio Art and is continuing her masters at Florida State University in Integrated Marketing Communication. </span>' +
                            '</div>' +
                            '<div class="featured-user-button vertical-align-wrapper text-center">' +
                                '<h3><a target="_blank" class="pc-btn blue filled">Marketing Intern</a></h3>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="col-xs-12 col-md-4 col-lg-4 featured-user xs-margin-top sm-margin-top">' +
                    '<div class="content-frame green-bckg">' +
                        '<div class="framed-content large-border">' +
                            '<div class="featured-user-icon" style="background-image: url(\'/static/omfiles/images/Jamal-Square.jpg\');">' +
                            '</div>' +
                            '<div class="featured-user-name text-pc-blue text-center">' +
                                '<h3>Jamal Ali-Mohammed</h3>' +
                            '</div>' +
                            '<div class="featured-user-quote vertical-align-wrapper">' +
                                '<span class="vertical-middle">Jamal believes there is always a better way to share information. He sees the need for simpler ways to represent ideas and information. Excessive, complex documentation only gets in the way of getting work done. Jamal is a junior at Florida State University, pursuing a B.A. in Editing, Writing and Media</span>' +
                            '</div>' +
                            '<div class="featured-user-button vertical-align-wrapper text-center">' +
                                '<h3><a class="pc-btn blue filled">PR Intern</a></h3>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>'+
    '</div>'+
    '<header class="blue">Contact</header>' +
    '<p><a href="mailto:help@properchannel.co">help@properchannel.co</a>, <a href="mailto:info@properchannel.co">info@properchannel.co</a></p>'+
  '</div>'+
'</section>'),

    initialize: function() {
        dbgconsolelog("Initializing About View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }
        this.render();
        //if ($('.logo-section').css('display') == 'none') {
        //    $('.logo-section').show();
        //}
    },

    render: function() {
        dbgconsolelog("Rendering About View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }
        this.$el.html(this.template({
            //arrowurl: 'static/omfiles/images/search-arrow-right.png'
        }));
        return this;
    },


});

App.ProfileChartView = Backbone.View.extend({

    render: function() {
        var self = this;

        var whichTemplate = this.type === 'normal' ? this.template : this.profileTemplate;
        this.$el.addClass(self.wrapClasses[self.type]).html(whichTemplate(this.model.attributes));

        var authorProfile = new App.UserProfile({user_id: self.model.get('created_by_name')});
        var authorFromCollection = user_profile_collection.get(self.model.get('created_by_name'));
        var authorView;

        if (authorFromCollection) {
            if (authorFromCollection.get('username')) {
                var authorView = new App.UserProfileChartView({
                    model: authorFromCollection
                });

                self.$el.find('.sample-author').html(authorView.render().el);
            }
            else {
                authorFromCollection.on('change', self.render, self);
            }
        }
        else {
            user_profile_collection.add(authorProfile);
            authorProfile.fetch().done(function() {
                var authorView = new App.UserProfileChartView({
                    model: authorProfile
                });

                self.$el.find('.sample-author').html(authorView.render().el);
            });
        }

        return this;
    },

    wrapClasses: {normal: 'chart-sample col-xs-12 col-sm-6 col-md-6 col-lg-3', profile: 'chart-sample col-xs-12 col-sm-6 col-md-6 col-lg-4'},

    template: _.template('' +
                //'<div class="col-xs-12 col-sm-6 col-md-6 col-lg-3">'+
                        '<div class="sample-wrapper">'+
                            '<div class="sample-title-wrapper text-center"><a class="sample-title" href="<%= "/chart/"+slug %>"><span class="title-text"><%= title %></span></a><a href="<%= "/chart/"+slug %>" class="sample-success <% if ((positive_votes - negative_votes) >= 0) { %>positive<% } else { %>negative<% } %>"><% if ((positive_votes - negative_votes) > 0) { %>+<% } %><%= positive_votes - negative_votes %></a></div>'+
                            '<div class="sample-thumb">' +
                                '<a href="<%= "/chart/"+slug %>"><img src="http://s3.amazonaws.com/properchannel-img/<%= imgurl %>" /></a>' +
                            '</div>'+
                            //'<div class="sample-info"><div class="sample-author">by <a href="/profile/<%= created_by_name %>" class="sample-author-name"><%= created_by_name %></a></div></div>'+
                            '<div class="sample-info"><div class="sample-author"></div></div>'+
                        '</div>'),
                //'</div>'),

    profileTemplate: _.template('' +
                //'<div class="col-xs-12 col-sm-6 col-md-6 col-lg-4">'+
                        '<div class="sample-wrapper">'+
                            '<div class="sample-title-wrapper text-center"><a class="sample-title" href="<%= "/chart/"+slug %>"><span class="title-text"><%= title %></span></a><a href="<%= "/chart/"+slug %>" class="sample-success <% if ((positive_votes - negative_votes) >= 0) { %>positive<% } else { %>negative<% } %>"><% if ((positive_votes - negative_votes) > 0) { %>+<% } %><%= positive_votes - negative_votes %></a></div>'+
                            '<div class="sample-thumb">' +
                                '<a href="<%= "/chart/"+slug %>"><img src="http://s3.amazonaws.com/properchannel-img/<%= imgurl %>" /></a>' +
                            '</div>'+
                            //'<div class="sample-info"><div class="sample-author">by <a href="/profile/<%= created_by_name %>" class="sample-author-name"><%= created_by_name %></a></div></div>'+
                            '<div class="sample-info"><div class="sample-author"></div></div>'+
                        '</div>'),
                //'</div>'),

    initialize: function(opts) {
        this.type = opts.type || 'normal';
    }
});

App.ChartRowView = Backbone.View.extend({
    className: 'col-xs-12',

    render: function() {
        var self = this;

        this.$el.html(this.template(this.model.attributes));


        /*var authorProfile = new App.UserProfile({user_id: self.model.get('created_by_name')});
        authorProfile.fetch().done(function() {
            var authorView = new App.UserProfileShortView({
                model: authorProfile
            });

            self.$el.find('.row-sample-author').html(authorView.render().el);
        });*/


        var authorProfile = new App.UserProfile({user_id: self.model.get('created_by_name')});
        var authorFromCollection = user_profile_collection.get(self.model.get('created_by_name'));
        var authorView;

        if (authorFromCollection) {
            if (authorFromCollection.get('username')) {
                var authorView = new App.UserProfileShortView({
                    model: authorFromCollection
                });

                self.$el.find('.row-sample-author').html(authorView.render().el);
            }
            else {
                authorFromCollection.on('change', self.render, self);
            }
        }
        else {
            user_profile_collection.add(authorProfile);
            authorProfile.fetch().done(function() {
                var authorView = new App.UserProfileShortView({
                    model: authorProfile
                });

                self.$el.find('.row-sample-author').html(authorView.render().el);
            });
        }

        return this;
    },

    template: _.template('' +
                //'<div class="col-xs-12">'+
                        '<div class="row row-sample-wrapper">'+
                            '<div class="row-sample-info text-center col-xs-12 col-sm-8">' +
                                '<a class="row-sample-title vertical-align-wrapper" href="<%= "/chart/"+slug %>"><span class="vertical-middle"><%= title %></span></a>'+
                                '<a class="row-sample-success vertical-align-wrapper <% if ((positive_votes - negative_votes) >= 0) { %>positive<% } else { %>negative<% } %>" href="<%= "/chart/"+slug %>"><span class="vertical-middle"><% if ((positive_votes - negative_votes) > 0) { %>+<% } %><%= positive_votes - negative_votes %></span></a>'+
                            '</div>' +
                            '<div class="text-center col-xs-8 col-xs-offset-2 col-sm-4 col-sm-offset-0"><div class="row-sample-author"></div></div>'+
                        '</div>')
                //'</div>')
});

App.ChartCollectionView = Backbone.View.extend({
    events: {
        'change .chartSort': 'changeSort',
        'click #view-type-button': 'toggleViewType'
    },

    viewTypes: ['grid', 'table'],

    viewTypeMarkup: { grid: '<span class="glyphicon glyphicon-th"></span>', table: '<span class="glyphicon glyphicon-th-list"></span>' },

    beforeFetch: function() {
        var self = this;
        $('#'+self.collectionName + '-chartCollection').addClass("loading-view");
    },

    beforePopulate: function() {
        this.beforePopulateCb();
    },

    afterPopulate: function() {
        this.afterPopulateCb();
    },

    onFetchSuccess: function(collection, response, opts) {
        this.onFetchSuccessCb(collection, response, opts);
    },

    onFetchFail: function(collection, response, opts) {
        this.onFetchFailCb(collection, response, opts);
    },

    renderParent: function() {
        this.renderParentCb();
    },

    changeSort: function(e) {
        this.chartCollection.changeComparator($(e.currentTarget).val());
        this.renderCollection();
    },

    toggleViewType: function(e) {
        var self = this;

        var nextMarkup = self.viewTypeMarkup[self.viewTypes[self.viewType]];

        if (self.viewType == $.inArray('grid', self.viewTypes)) {
            self.viewType = $.inArray('table', self.viewTypes);
        }
        else if (self.viewType == $.inArray('table', self.viewTypes)) {
            self.viewType = $.inArray('grid', self.viewTypes);
        }

        $(e.currentTarget).html(nextMarkup);
        this.renderCollection();
    },

    loadError: '<div class="col-xs-12"><h2>There was a problem loading the data. Please try reloading the page.</h2></div>',

    template: _.template('<div class="row"><div class="col-xs-6"><% if (showSort) { %>Sort By: <select class="chartSort" id="<%= collectionName %>-chartSort" name="filter"><% if (isSearch) { %><option value="relevance" <% if (initialSort === "relevance") { %>selected="selected"<% } %>>Relevance</option><% } %><option value="editnew" <% if (initialSort === "editnew") { %>selected="selected"<% } %>>Most Recently Edited</option><option value="editold" <% if (initialSort === "editold") { %>selected="selected"<% } %>>Least Recently Edited</option><option value="newest" <% if (initialSort === "newest") { %>selected="selected"<% } %>>Newest</option><option value="oldest" <% if (initialSort === "oldest") { %>selected="selected"<% } %>>Oldest</option><option value="atoz" <% if (initialSort === "atoz") { %>selected="selected"<% } %>>Title: A to Z</option><option value="ztoa" <% if (initialSort === "ztoa") { %>selected="selected"<% } %>>Title: Z to A</option><option value="voteHigh" <% if (initialSort === "voteHigh") { %>selected="selected"<% } %>>Votes: High to Low</option><option value="voteLow" <% if (initialSort === "voteLow") { %>selected="selected"<% } %>>Votes: Low to High</option></select><% } %></div><div class="col-xs-6"><div id="view-type-button" class="btn pc-btn pull-right"><% if (selectedView != $.inArray("table", viewTypes)) { %><span class="glyphicon glyphicon-th-list"></span><% } %><% if (selectedView != $.inArray("grid", viewTypes)) { %><span class="glyphicon glyphicon-th"></span><% } %></div></div></div><div class="row" id="<%= collectionName %>-chartCollection"><div class="loading-wrapper"></div><div class="pc-loading"></div></div>'),

    renderCollection: function(setUpParent) {
        var self = this;

        self.beforeFetch();

        self.chartCollection.fetch({ success: function(collection, response, opts) {
             if (setUpParent) {
                self.renderParent();
                self.setElement($(self.chartContainer));
                self.$el.html(self.template({collectionName: self.collectionName, selectedView: self.viewType, viewTypes: self.viewTypes, isSearch: self.isSearch, showSort: self.showSort, initialSort: self.initialSort }));
            }
            self.onFetchSuccess(collection, response, opts);
            self.beforePopulate();
            self.$chartContainer = $('#'+self.collectionName+'-chartCollection .loading-wrapper');
            /*_.each(self.chartCollection.models, function(chart) {
                var newChart = new App.ProfileChartView({ model: chart });
                self.$el.append(newChart.render().el);
            });*/
            self.chartCollection.sort();
            self.$chartContainer.empty();
            self.chartCollection.each(function(chart) {
                var newChart;
                if (self.viewType == $.inArray('grid', self.viewTypes))
                    newChart = new App.ProfileChartView({ model: chart, type: self.chartSampleType });
                else
                    newChart = new App.ChartRowView({ model: chart });
                self.$chartContainer.append(newChart.render().el);
            });
            self.afterPopulate();
            $('#' + self.collectionName + '-chartCollection').removeClass("loading-view");
        }, error: function(collection, response, opts) {
            //selectedSection.removeClass("loading");
            self.onFetchFail(collection, response, opts);
            $('#' + self.collectionName + '-chartCollection').removeClass("loading-view");
            self.$el.html(self.loadError);
        }});
    },

    render: function() {
        var self = this;

        self.renderCollection(true);

    },

    initialize: function(opts) {
        opts = opts || {};
        this.chartContainer = opts.chartContainer || '#chart-collection-container';
        this.chartCollection = opts.chartCollection || new App.ChartsCollection();
        this.beforePopulateCb = opts.beforePopulate || function() {};
        this.afterPopulateCb = opts.afterPopulate || function() {};
        this.renderParentCb = opts.renderParent || function() {};
        this.onFetchFailCb = opts.onFetchFail || function() {};
        this.onFetchSuccessCb = opts.onFetchSuccess || function() {};
        this.collectionName = opts.collectionName || ('' + new Date().getTime());
        this.chartSampleType = opts.chartSampleType || 'normal';
        this.viewType = $.inArray('grid', this.viewTypes);
        this.isSearch = opts.isSearch || false;
        this.showSort = opts.showSort !== undefined ? opts.showSort : true;
        this.initialSort = opts.initialSort || 'editnew';

        /*if (this.isSearch)
            this.chartCollection.changeComparator('relevance');
        else*/
        this.chartCollection.changeComparator(this.initialSort);
    }
});

App.ChartScrollView = Backbone.View.extend({
    events: {
        'click .scroll-nav.next': 'nextPage',
        'click .scroll-nav.prev': 'prevPage'
    },

    /*viewTypes: ['grid', 'table'],

    viewTypeMarkup: { grid: '<span class="glyphicon glyphicon-th"></span>', table: '<span class="glyphicon glyphicon-th-list"></span>' },*/

    nextPage: function() {
        var self = this;
        var containerWidth = self.$el.find('.horizontal-scroll-container').outerWidth();
        var currentScroll = self.$el.find('.horizontal-scroll-container').scrollLeft();
        var currPage = Math.floor(currentScroll / containerWidth);
        var currentScroll = containerWidth * currPage;

        $('#landing-charts .horizontal-scroll-container').animate({scrollLeft: currentScroll + containerWidth});

    },

    prevPage: function() {
        var self = this;
        var containerWidth = self.$el.find('.horizontal-scroll-container').outerWidth();
        var currentScroll = self.$el.find('.horizontal-scroll-container').scrollLeft();
        var currPage = Math.ceil(currentScroll / containerWidth);
        var currentScroll = containerWidth * currPage;

        $('#landing-charts .horizontal-scroll-container').animate({scrollLeft: currentScroll - containerWidth});
    },

    setUpScroll: function(target) {
        var self = this;
        $(target).on('scroll', self.onScroll.bind(self));
    },

    onScroll: function(ev) {
        var self = this;
        self.handleScroll(ev.currentTarget);
    },

    handleScroll: function(target) {
        var targetWidth = $(target).outerWidth();
        var targetScroll = $(target).scrollLeft();
        if (targetScroll <= 0) {
            $('.scroll-nav.prev').addClass('disabled');
            $('.scroll-nav.next').removeClass('disabled');
        }
        else if (targetScroll+targetWidth >= target.scrollWidth) {
            $('.scroll-nav.next').addClass('disabled');
            $('.scroll-nav.prev').removeClass('disabled');
        }
        else {
            $('.scroll-nav.next').removeClass('disabled');
            $('.scroll-nav.prev').removeClass('disabled');
        }
    },

    beforeFetch: function() {
        var self = this;
        $('#'+self.collectionName + '-chartCollection').addClass("loading-view");
    },

    beforePopulate: function() {
        this.beforePopulateCb();
    },

    afterPopulate: function() {
        this.afterPopulateCb();
    },

    onFetchSuccess: function(collection, response, opts) {
        this.onFetchSuccessCb(collection, response, opts);
    },

    onFetchFail: function(collection, response, opts) {
        this.onFetchFailCb(collection, response, opts);
    },

    renderParent: function() {
        this.renderParentCb();
    },

    changeSort: function(e) {
        this.chartCollection.changeComparator($(e.currentTarget).val());
        this.renderCollection();
    },

    loadError: '<div class="col-xs-12"><h2>There was a problem loading the data. Please try reloading the page.</h2></div>',

    template: _.template('<div class="row horizontal-scroll-wrapper chart-scroller" id="<%= collectionName %>-chartCollection">' +
                            '<div class="scroll-nav prev vertical-align-wrapper"><span class="scroll-nav-icon fa fa-chevron-left vertical-middle"></span></div>' +
                            '<div class="loading-wrapper horizontal-scroll-container">' +
                            '</div>' +
                            '<div class="scroll-nav next vertical-align-wrapper"><span class="scroll-nav-icon fa fa-chevron-right vertical-middle"></span></div>' +
                            '<div class="pc-loading"></div>' +
                         '</div>'),

    renderCollection: function(setUpParent) {
        var self = this;

        self.beforeFetch();

        self.chartCollection.fetch({ success: function(collection, response, opts) {
             if (setUpParent) {
                self.renderParent();
            }

            self.setElement($(self.chartContainer));
            self.$el.html(self.template({collectionName: self.collectionName, selectedView: self.viewType, viewTypes: self.viewTypes, isSearch: self.isSearch, showSort: self.showSort, initialSort: self.initialSort }));
            self.setUpScroll(self.$el.find('.horizontal-scroll-container').get(0));
            self.handleScroll(self.$el.find('.horizontal-scroll-container').get(0));

            self.onFetchSuccess(collection, response, opts);
            self.beforePopulate();
            self.$chartContainer = $('#'+self.collectionName+'-chartCollection .loading-wrapper');
            /*_.each(self.chartCollection.models, function(chart) {
                var newChart = new App.ProfileChartView({ model: chart });
                self.$el.append(newChart.render().el);
            });*/
            self.chartCollection.sort();
            self.$chartContainer.empty();
            self.chartCollection.each(function(chart, index) {
                var newChart;
                if (self.viewType == $.inArray('grid', self.viewTypes))
                    newChart = new App.ProfileChartView({ model: chart, type: self.chartSampleType });
                else
                    newChart = new App.ChartRowView({ model: chart });
                self.$chartContainer.append(newChart.render().el);
            });
            self.afterPopulate();
            $('#' + self.collectionName + '-chartCollection').removeClass("loading-view");
        }, error: function(collection, response, opts) {
            //selectedSection.removeClass("loading");
            self.onFetchFail(collection, response, opts);
            $('#' + self.collectionName + '-chartCollection').removeClass("loading-view");
            self.$el.html(self.loadError);
        }});
    },

    render: function() {
        var self = this;

        self.renderCollection(true);

    },

    initialize: function(opts) {
        opts = opts || {};
        this.chartContainer = opts.chartContainer || '#chart-collection-container';
        this.chartCollection = opts.chartCollection || new App.ChartsCollection();
        this.beforePopulateCb = opts.beforePopulate || function() {};
        this.afterPopulateCb = opts.afterPopulate || function() {};
        this.renderParentCb = opts.renderParent || function() {};
        this.onFetchFailCb = opts.onFetchFail || function() {};
        this.onFetchSuccessCb = opts.onFetchSuccess || function() {};
        this.collectionName = opts.collectionName || ('' + new Date().getTime());
        this.chartSampleType = opts.chartSampleType || 'normal';
        this.viewType = $.inArray('grid', this.viewTypes);
        this.isSearch = opts.isSearch || false;
        this.showSort = opts.showSort !== undefined ? opts.showSort : true;
        this.initialSort = opts.initialSort || 'editnew';

        if (this.isSearch)
            this.chartCollection.changeComparator('relevance');
        else
            this.chartCollection.changeComparator(this.initialSort);

        // The element was defined in the options. The Scroll markup and content is already setup (probably from server). Just make sure that scrolling details are handled without rendering from backbone
        if (opts.el) {
            var self = this;
            self.setUpScroll(self.$el.find('.horizontal-scroll-container').get(0));
            self.handleScroll(self.$el.find('.horizontal-scroll-container').get(0));
        }
    }
});

App.ChartCarouselView = Backbone.View.extend({
    /*events: {
        'change .chartSort': 'changeSort',
        'click #view-type-button': 'toggleViewType'
    },

    viewTypes: ['grid', 'table'],

    viewTypeMarkup: { grid: '<span class="glyphicon glyphicon-th"></span>', table: '<span class="glyphicon glyphicon-th-list"></span>' },*/

    beforeFetch: function() {
        var self = this;
        $('#'+self.collectionName + '-chartCollection').addClass("loading-view");
    },

    beforePopulate: function() {
        this.beforePopulateCb();
    },

    afterPopulate: function() {
        this.afterPopulateCb();
    },

    onFetchSuccess: function(collection, response, opts) {
        this.onFetchSuccessCb(collection, response, opts);
    },

    onFetchFail: function(collection, response, opts) {
        this.onFetchFailCb(collection, response, opts);
    },

    renderParent: function() {
        this.renderParentCb();
    },

    changeSort: function(e) {
        this.chartCollection.changeComparator($(e.currentTarget).val());
        this.renderCollection();
    },

    loadError: '<div class="col-xs-12"><h2>There was a problem loading the data. Please try reloading the page.</h2></div>',

    template: _.template('<div class="row" id="<%= collectionName %>-chartCollection" class="carousel slide" data-ride="carousel">' +
                            '<div class="loading-wrapper carousel-inner">' +
                            '</div>' +
                            '<a class="left carousel-control" href="#<%= collectionName %>-chartCollection" role="button" data-slide="prev">' +
                                '<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>' +
                                '<span class="sr-only">Previous</span>' +
                            '</a>' +
                            '<a class="right carousel-control" href="#<%= collectionName %>-chartCollection" role="button" data-slide="next">' +
                                '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>' +
                                '<span class="sr-only">Next</span>' +
                            '</a>' +
                            '<div class="pc-loading"></div>' +
                         '</div>'),

    renderCollection: function(setUpParent) {
        var self = this;

        self.beforeFetch();

        self.chartCollection.fetch({ success: function(collection, response, opts) {
             if (setUpParent) {
                self.renderParent();
                self.setElement($(self.chartContainer));
                self.$el.html(self.template({collectionName: self.collectionName, selectedView: self.viewType, viewTypes: self.viewTypes, isSearch: self.isSearch, showSort: self.showSort, initialSort: self.initialSort }));
            }
            self.onFetchSuccess(collection, response, opts);
            self.beforePopulate();
            self.$chartContainer = $('#'+self.collectionName+'-chartCollection .loading-wrapper');
            /*_.each(self.chartCollection.models, function(chart) {
                var newChart = new App.ProfileChartView({ model: chart });
                self.$el.append(newChart.render().el);
            });*/
            self.chartCollection.sort();
            self.$chartContainer.empty();
            self.chartCollection.each(function(chart, index) {
                var newChart;
                if (self.viewType == $.inArray('grid', self.viewTypes))
                    newChart = new App.ProfileChartView({ model: chart, type: self.chartSampleType });
                else
                    newChart = new App.ChartRowView({ model: chart });
                var itemContainer = $('<div>').addClass('item');
                if (index === 0)
                    itemContainer.addClass('active');
                self.$chartContainer.append(itemContainer.append(newChart.render().el));
            });
            self.afterPopulate();
            $('#' + self.collectionName + '-chartCollection').removeClass("loading-view");
        }, error: function(collection, response, opts) {
            //selectedSection.removeClass("loading");
            self.onFetchFail(collection, response, opts);
            $('#' + self.collectionName + '-chartCollection').removeClass("loading-view");
            self.$el.html(self.loadError);
        }});
    },

    render: function() {
        var self = this;

        self.renderCollection(true);

    },

    initialize: function(opts) {
        opts = opts || {};
        this.chartContainer = opts.chartContainer || '#chart-collection-container';
        this.chartCollection = opts.chartCollection || new App.ChartsCollection();
        this.beforePopulateCb = opts.beforePopulate || function() {};
        this.afterPopulateCb = opts.afterPopulate || function() {};
        this.renderParentCb = opts.renderParent || function() {};
        this.onFetchFailCb = opts.onFetchFail || function() {};
        this.onFetchSuccessCb = opts.onFetchSuccess || function() {};
        this.collectionName = opts.collectionName || ('' + new Date().getTime());
        this.chartSampleType = opts.chartSampleType || 'normal';
        this.viewType = $.inArray('grid', this.viewTypes);
        this.isSearch = opts.isSearch || false;
        this.showSort = opts.showSort !== undefined ? opts.showSort : true;
        this.initialSort = opts.initialSort || 'editnew';

        if (this.isSearch)
            this.chartCollection.changeComparator('relevance');
        else
            this.chartCollection.changeComparator(this.initialSort);
    }
});

App.UserProfileShortView = Backbone.View.extend({
    className: 'author-badge',
    template: _.template('<a class="author-pic" href="/profile/<%= username %>" style="background-image: url(\'<%= profile_image_url ? profile_image_prefix+profile_image_url : this.defaultProfilePic()  %>\');"></a>' +
                        '<div class="author-info-wrapper">' +
                            '<a class="author-name vertical-align-wrapper" href="/profile/<%= username %>"><span class="vertical-middle"><%= username %></span></a>' +
                            '<a class="author-rating vertical-align-wrapper" href="/profile/<%= username %>"><span class="vertical-middle <% if ((upvotes_received - downvotes_received) >= 0) { %>positive<% } else { %>negative<% } %>"><% if ((upvotes_received - downvotes_received) > 0) { %>+<% } %><%= upvotes_received - downvotes_received %></span></a>' +
                        '</div>'),
    /*initialize: function(opts) {
        var self = this;

        self.profileSection = opts.profileSection || 'summary';

        this.createdCharts = new App.UserCreatedCharts({user_id: this.model.get('user_id')});
        this.savedCharts = new App.UserSavedCharts({user_id: this.model.get('user_id')});
        this.followDetails = new App.UserFollowDetails({user_id: this.model.get('user_id')});
    },*/
    render: function() {
        var self = this;

        self.$el.addClass(self.extraClasses);
        //self.model.attributes.profile_image_url = self.model.attributes.profile_image_url ? profile_image_prefix+self.model.attributes.profile_image_url : self.defaultProfilePic();
        self.$el.html(self.template(self.model.attributes));
        return self;
    },

    defaultProfilePic: function() {
        var defaultPics = ['profile-pic-default-decision.png', 'profile-pic-default-start.png', 'profile-pic-default-step.png'];

        return '/static/omfiles/images/' + defaultPics[Math.floor((Math.random() * defaultPics.length))];
    },

    initialize: function(opts) {
        opts = opts || {};
        this.extraClasses = opts.extraClasses || '';
    }
});

App.UserProfileChartView = Backbone.View.extend({
    className: 'author-wrapper',
    template: _.template('<a href="/profile/<%= user_id %>">' +
                            '<img class="author-pic" style="background-image: url(\'<%= profile_image_url ? profile_image_prefix+profile_image_url : this.defaultProfilePic() %>\');" />'+
                            '<span class="author-name">'+
                                '<%= user_id %>'+
                            '</span>'+
                            '<span class="author-rating <% if ((upvotes_received - downvotes_received) >= 0) { %>positive<% } else { %>negative<% } %>"><% if ((upvotes_received - downvotes_received) > 0) { %>+<% } %><%= upvotes_received - downvotes_received %></span>' +
                        '</a>'),
    /*initialize: function(opts) {
        var self = this;

        self.profileSection = opts.profileSection || 'summary';

        this.createdCharts = new App.UserCreatedCharts({user_id: this.model.get('user_id')});
        this.savedCharts = new App.UserSavedCharts({user_id: this.model.get('user_id')});
        this.followDetails = new App.UserFollowDetails({user_id: this.model.get('user_id')});
    },*/
    render: function() {
        var self = this;

        self.$el.addClass(self.extraClasses);
        //self.model.attributes.profile_image_url = self.model.attributes.profile_image_url ? profile_image_prefix+self.model.attributes.profile_image_url : self.defaultProfilePic();
        self.$el.html(self.template(self.model.attributes));
        return self;
    },

    defaultProfilePic: function() {
        var defaultPics = ['profile-pic-default-decision.png', 'profile-pic-default-start.png', 'profile-pic-default-step.png'];

        return '/static/omfiles/images/' + defaultPics[Math.floor((Math.random() * defaultPics.length))];
    },

    initialize: function(opts) {
        opts = opts || {};
        this.extraClasses = opts.extraClasses || '';
    }
});

App.UserProfileView = Backbone.View.extend({
    el: "#appviewcontent",

    events: {
        'click .header-link': 'navFromHeadline',
        'click .stat-button': 'navFromStat',
        'click a[data-toggle][href]': 'handleSectionLink',
        'click #follow-button': 'followUser',
        'click #unfollow-button': 'unfollowUser',
        'change #pic-input': 'previewPic',
        'click #accept-pic': 'acceptPic',
        'click #cancel-pic': 'cancelPic'
    },

    navFromHeadline: function(e) {
        e.preventDefault();

        $("a[data-toggle][href=\""+$(e.currentTarget).attr("href")+"\"]").click();
    },

    navFromStat: function(e) {
        e.preventDefault();
        var sectionOpts;

        if ($(e.currentTarget).attr("data-stat-link") === 'flowcharts' && typeof $(e.currentTarget).attr("data-stat-link-opt") !== 'undefined')
            sectionOpts = { sort: $(e.currentTarget).attr("data-stat-link-opt") };

        this.populateSection("#"+$(e.currentTarget).attr("data-stat-link"), sectionOpts );

        $('.profile-menu-opt a[href="#'+$(e.currentTarget).attr("data-stat-link")+'"]').tab('show');
    },

    handleSectionLink: function(e) {
        var self = this;
        var selectedSection = $(e.currentTarget).attr("href");
        self.populateSection(selectedSection);
    },

    followButton: '<img id="follow-button" src="/static/omfiles/images/profile-follow-icon.png">',

    followUser: function(e) {
        e.preventDefault();

        var self = this;

        currentUser.fetch({
            success: function() {
                if(currentUser.get('email') === "none") {
                    Messenger().post({
                        message: "Please login or register to follow users!",
                        type: "error",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                }
                else {
                    $.ajax({
                        method: 'POST',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: '/api/user/'+self.model.get('requestinguser')+'/follow/',
                        data: { other_user: self.model.get('username') },
                        success: function(response) {
                            dbgconsolelog(response);
                            $('#follow-button').remove();
                            $('#profile-pic-wrapper').append(self.unfollowButton);
                            Messenger().post({
                                message: "You have followed this user.",
                                type: "success",
                                showCloseButton: true,
                                hideAfter: 5,
                                hideOnNavigate: true
                            });
                            self.model.fetch().done(function () {
                                //self.render();
                                self.loadFollowSummary();
                            });
                        },
                        fail: function(response) {
                            dbgconsolelog(response);
                            Messenger().post({
                                message: "There was a problem unfollowing this user. Please try again later.",
                                type: "error",
                                showCloseButton: true,
                                hideAfter: 5,
                                hideOnNavigate: true
                            });
                        }
                    })
                }
            }
        });
    },

    unfollowButton: '<img id="unfollow-button" src="/static/omfiles/images/profile-unfollow-icon.png">',

    unfollowUser: function(e) {
        e.preventDefault();

        var self = this;

        currentUser.fetch({
            success: function() {
                if(currentUser.get('email') === "none") {
                    Messenger().post({
                        message: "Please login or register to unfollow users!",
                        type: "error",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                }
                else {
                    $.ajax({
                        method: 'POST',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: '/api/user/'+self.model.get('requestinguser')+'/unfollow/',
                        data: {
                            other_user: self.model.get('username')
                        },
                        success: function(response) {
                            dbgconsolelog(response);
                            $('#unfollow-button').remove();
                            $('#profile-pic-wrapper').append(self.followButton);
                            Messenger().post({
                                message: "You have unfollowed this user.",
                                type: "success",
                                showCloseButton: true,
                                hideAfter: 5,
                                hideOnNavigate: true
                            });
                            self.model.fetch().done(function () {
                                //self.render();
                                self.loadFollowSummary();
                            });
                        },
                        fail: function(response) {
                            dbgconsolelog(response);
                            Messenger().post({
                                message: "There was a problem unfollowing this user. Please try again later.",
                                type: "error",
                                showCloseButton: true,
                                hideAfter: 5,
                                hideOnNavigate: true
                            });
                        }
                    })
                }
            }
        })
    },

    defaultProfilePic: function() {
        var defaultPics = ['profile-pic-default-decision.png', 'profile-pic-default-start.png', 'profile-pic-default-step.png'];

        return '/static/omfiles/images/' + defaultPics[Math.floor((Math.random() * defaultPics.length))];
    },

    picInput: '<input id="pic-input" type="file" title="Choose profile picture" accept="image/*">',
    editPicButton: '<img id="edit-pic-button" src="/static/omfiles/images/profile-edit-pic-icon.png">',
    acceptPicButton: '<div id="accept-pic"><span class="glyphicon glyphicon-ok"></span></div>',
    cancelPicButton: '<div id="cancel-pic"><span class="glyphicon glyphicon-remove"></span></div>',

    previewPic: function(e) {
        e.preventDefault();

        var exts = ['jpg', 'jpeg', 'png'];
        var image = new Image();
        var file = document.getElementById($(e.currentTarget).attr('id')).files[0];
        var fileReader = new FileReader();
        fileReader.onload = function(event) {
            image.src = event.target.result;
            image.onload = function() {
                var w = this.width, h = this.height, type = file.type;
                if ($.inArray(type.split('/')[1], exts) > -1) {
                    $('#profile-pic-wrapper').addClass('preview');
                    $('#profile-pic').css('background-image', 'url(\''+event.target.result+'\')')
                    $('#profile-pic').attr('data-pic-dataurl', event.target.result);
                }
                else {
                    Messenger().post({
                        message: "Please select an image file (jpg, jpeg or png)!",
                        type: "error",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                }
            }
            image.onerror = function() {
                Messenger().post({
                    message: "Please select an image file (jpg, jpeg or png)!",
                    type: "error",
                    showCloseButton: true,
                    hideAfter: 5,
                    hideOnNavigate: true
                });
            }
        };
        fileReader.readAsDataURL(file);
    },

    acceptPic: function(e) {
        e.preventDefault();

        var self = this;


        $.ajax({
            method: 'POST',
            xhrFields: {
                withCredentials: true
            },
            url: '/api/user/profileimageupload/',
            data: { imgupload: $('#profile-pic').attr('data-pic-dataurl') },
            success: function(response) {
                dbgconsolelog(response);

                self.model.fetch().done(function() {
                    Messenger().post({
                        message: "Successfully updated your profile image!",
                        type: "success",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                    $('#profile-pic-wrapper').removeClass('preview');

                    var picImg = (profile_image_prefix+self.model.get("profile_image_url")) || self.defaultProfilePic();

                    $('#profile-pic').css('background-image', 'url(\''+picImg+'\')');
                });
            },
            fail: function(response) {
                dbgconsolelog(response);
                Messenger().post({
                    message: "There was a problem uploading the image. Please try again later.",
                    type: "error",
                    showCloseButton: true,
                    hideAfter: 5,
                    hideOnNavigate: true
                });
            }
        });

    },

    cancelPic: function(e) {
        e.preventDefault();

        var self = this;

        $('#profile-pic-wrapper').removeClass('preview');

        //$('#profile-pic').attr('src', self.model.get("profile_image_url") || self.defaultProfilePic());
        var picImg = profile_image_prefix+self.model.get("profile_image_url") || self.defaultProfilePic();
        $('#profile-pic').css('background-image', 'url(\''+picImg+'\')');

    },

    /*createdCharts: function() {
        return new App.UserCreatedCharts({user_id: this.model.get('user_id')});
    },*/
    loadError: '<div class="col-xs-12"><h2>There was a problem loading the data. Please try reloading the page.</h2></div>',

    populateSection: function(section, sectionOpts) {
        var self = this;
        var selectedSection = $(section);
        var container =  $(section+' .section-container');
        sectionOpts = sectionOpts || {};

        //if (container.length && !container.hasClass("loaded") && !container.hasClass("loading")) {
        if (!selectedSection.hasClass("loaded") && !selectedSection.hasClass("loading")) {

            if(section == "#summary") {
                self.loadChartsSummary();
                self.loadFollowSummary();
            }
            else if (section == "#flowcharts" || section == "#favorites") {

                selectedSection.addClass("loading");
                container.empty();

                var chartCollection = section == "#flowcharts" ? self.createdCharts : self.savedCharts;
                chartCollection.count = '';
                /*chartCollection.fetch().done(function() {
                    //self.$el.append(JSON.stringify(createdCharts));
                    selectedSection.removeClass("loading");
                    selectedSection.addClass("loaded");
                    _.each(chartCollection.models, function(chart) {
                        var newChart = new App.ProfileChartView({ model: chart });
                        container.append(newChart.render().el);
                    });
                }).fail(function() {
                    selectedSection.removeClass("loading");
                    container.append(self.loadError);
                });*/
                var startSort = sectionOpts.sort || 'editnew';
                var chartCollectionView = new App.ChartCollectionView({
                    chartContainer: section+' .section-container',
                    chartCollection: chartCollection,
                    initialSort: startSort,
                    afterPopulate: function() {
                        selectedSection.removeClass("loading");
                        selectedSection.addClass("loaded");
                    },
                    chartSampleType: 'profile'
                });
                chartCollectionView.render();

            }
            else if (section == "#followers" || section == "#following") {

                selectedSection.addClass("loading");
                container.empty();

                self.followDetails.count = '';
                self.followDetails.fetch().done(function() {
                    //self.$el.append(JSON.stringify(createdCharts));
                    selectedSection.removeClass("loading");
                    selectedSection.addClass("loaded");

                    var followArray = section == "#followers" ? self.followDetails.attributes.followed_by : self.followDetails.attributes.following
                    _.each(followArray, function(follow) {
                        follow.profile_image_url = follow.profile_image_url ? profile_image_prefix+follow.profile_image_url : self.defaultProfilePic();
                        var newFollow = new App.FollowView({ model: follow });
                        container.append(newFollow.render().el);
                    });
                }).fail(function() {
                    selectedSection.removeClass("loading");
                    container.append(self.loadError);
                });
            }

           // else if (section == "#Settings"){
                //selectedSection.addClass("loading");
                //container.empty();
                //selectedSection.removeClass("loading");
                //selectedSection.addClass("loaded");
                             //}

            /*if (selectedSection == "#flowcharts") {
                var chartCollection =
                self.createdCharts.count = '';
                self.createdCharts.fetch().done(function() {
                    //self.$el.append(JSON.stringify(createdCharts));
                    container.removeClass("loading");
                    container.addClass("loaded");
                    _.each(self.createdCharts.models, function(chart) {
                        var newChart = new App.ProfileChartView({ model: chart });
                        container.append(newChart.render().el);
                    });
                });
            }
            else if (selectedSection == "#favorites") {
                self.savedCharts.count = '';
                self.savedCharts.fetch().done(function() {
                    //self.$el.append(JSON.stringify(createdCharts));
                    container.removeClass("loading");
                    container.addClass("loaded");
                    _.each(self.savedCharts.models, function(chart) {
                        var newChart = new App.ProfileChartView({ model: chart });
                        container.append(newChart.render().el);
                    });
                });
            }*/
        }

        var sectionPath = '/profile/'+self.model.get('username');

        if(section != "#summary") {
            sectionPath += '/' + section.split('#')[1];
        }

        var currentPath = window.location.pathname.replace(/\/$/, "");

        if (sectionPath != window.location.pathname)
            history.pushState(null, null, sectionPath);
    },


    loadChartsSummary: function() {

        var self = this;

        var createdSection = $('#summary-flowcharts .summary-section-container');
        createdSection.addClass("loading");
        createdSection.empty();
        self.createdCharts.count = 3;
        self.createdCharts.fetch().done(function() {
            //self.$el.append(JSON.stringify(createdCharts));
            createdSection.removeClass("loading");
            createdSection.addClass("loaded");

            if (self.createdCharts.models.length) {
                _.each(self.createdCharts.models, function(chart) {
                    var newChart = new App.ProfileChartView({ model: chart, type: 'profile' });
                   createdSection.append(newChart.render().el);
                });
            }
            else {
                createdSection.append('<div class="col-xs-12 text-center"><h2>0 Charts</h2></div>');
            }
        });

        if (self.model.get('is_querying_self')) {
            $('#summary-flowcharts').after(self.savedChartsSection);
            var savedSection = $('#summary-favorites .summary-section-container');
            savedSection.addClass("loading");
            savedSection.empty();
            self.savedCharts.count = 3;
            self.savedCharts.fetch().done(function() {
                //self.$el.append(JSON.stringify(createdCharts));
                savedSection.removeClass("loading");
                savedSection.addClass("loaded");

                if (self.savedCharts.models.length) {
                    _.each(self.savedCharts.models, function(chart) {
                        var newChart = new App.ProfileChartView({ model: chart, type: 'profile' });
                        savedSection.append(newChart.render().el);
                    });
                }
                else {
                    savedSection.append('<div class="col-xs-12 text-center"><h2>0 Favorite Charts</h2></div>');
                }
            });
        }
    },

    loadFollowSummary: function() {

        var self = this;

        var followingSection =  $('#summary-following .summary-section-container');
        var followersSection =  $('#summary-followers .summary-section-container');
        followingSection.addClass("loading");
        followersSection.addClass("loading");
        followingSection.empty();
        followersSection.empty();
        self.followDetails.count = 3;
        self.followDetails.fetch().done(function() {
            //self.$el.append(JSON.stringify(createdCharts));
            followingSection.removeClass("loading");
            followingSection.addClass("loaded");
            followersSection.removeClass("loading");
            followersSection.addClass("loaded");

            if (self.followDetails.attributes.following.length) {
                _.each(self.followDetails.attributes.following, function(follow) {
                    follow.profile_image_url = follow.profile_image_url ? profile_image_prefix+follow.profile_image_url : self.defaultProfilePic();
                    var newFollow = new App.FollowView({ model: follow });
                    followingSection.append(newFollow.render().el);
                });
            }
            else {
                followingSection.append('<div class="col-xs-12 text-center"><h2>0 Following</h2></div>');
            }

            if (self.followDetails.attributes.followed_by.length) {
                _.each(self.followDetails.attributes.followed_by, function(follow) {
                    follow.profile_image_url = follow.profile_image_url ? profile_image_prefix+follow.profile_image_url : self.defaultProfilePic();
                    var newFollow = new App.FollowView({ model: follow });
                    followersSection.append(newFollow.render().el);
                });
            }
            else {
                followersSection.append('<div class="col-xs-12 text-center"><h2>0 Followers</h2></div>');
            }
        });
    },

    initialize: function(opts) {
        /*dbgconsolelog("Initializing About View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }*/
        var self = this;

        self.profileSection = opts.profileSection || 'summary';

        this.createdCharts = new App.UserCreatedCharts({user_id: this.model.get('user_id')});
        this.savedCharts = new App.UserSavedCharts({user_id: this.model.get('user_id')});
        this.followDetails = new App.UserFollowDetails({user_id: this.model.get('user_id')});
        this.render();
        //if ($('.logo-section').css('display') == 'none') {
        //    $('.logo-section').show();
        //}
    },

    render: function() {
        /*dbgconsolelog("Rendering About View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }*/
        var self = this;
        this.$el.html(this.template({
            user: self.model,
            selectedSection: self.profileSection,
            defaultPic: self.defaultProfilePic(),
            env: e_v
        }));

        /*self.loadChartsSummary();
        self.loadFollowSummary();*/

        self.populateSection('#'+self.profileSection)

        if (!self.model.get('is_querying_self')) {
            if ($.inArray(self.model.get('requestinguser'), self.model.get('followedby')) > -1)
                $('#profile-pic-wrapper').append(self.unfollowButton);
            else
                $('#profile-pic-wrapper').append(self.followButton);
        }
        else {
            $('#profile-pic-wrapper').append(self.editPicButton);
            $('#profile-pic-wrapper').append(self.picInput);
            $('#profile-pic-wrapper').append(self.acceptPicButton);
            $('#profile-pic-wrapper').append(self.cancelPicButton);
            $('li.profile-menu-opt a[href="#flowcharts"]').parent().after(self.savedChartsMenuOpt({selectedSection: self.profileSection}));
        }

        dispatcher.trigger('renderEvent');
        return this;
    },

    savedChartsSection: '<section id="summary-favorites">' +
                            '<header class="blue"><a class="header-link" href="#favorites"><h2 class="header-title">Favorites</h2><span class="more-link">More</span></a></header>' +
                            '<div class="row summary-section-container">' +
                            '</div>' +
                        '</section>',

    savedChartsMenuOpt: _.template('<li class="profile-menu-opt menu-opt <% if (selectedSection == "favorites") { %>active<% } %>"><a href="#favorites" data-toggle="pill" class="menu-opt-content"><span>Favorites</span><span class="glyphicon glyphicon-chevron-right menu-opt-accessory right"></span></a></li>'),

    template: _.template(''+
        '<section class="middle-panel clearfix">'+
            '<div class="container">' +
                '<div id="profile-left-col">' +
                    '<div class="row">' +
                        '<div id="profile-info"><div id="profile-pic-wrapper"><div id="profile-pic" style="background-image: url(\'<%= user.get("profile_image_url") ? profile_image_prefix+user.get("profile_image_url") : defaultPic %>\')"></div></div><div id="profile-username"><h2 class="text-center"><%= user.get("username") %></h2></div></div>' +
                        /*'<div id="profile-username"><h2 class="text-center">WMCCLUSKEY</h2></div>' +*/
                        '<div id ="profile-menu" class="stacked-menu">' +
                            '<ul class="nav nav-pills nav-stacked">' +
                                '<li class="profile-menu-opt menu-opt <% if (selectedSection == "summary") { %>active<% } %>" ><a href="#summary" data-toggle="pill" class="menu-opt-content"><span>Summary</span><span class="glyphicon glyphicon-chevron-right menu-opt-accessory right"></span></a></li>' +
                                '<li class="profile-menu-opt menu-opt <% if (selectedSection == "flowcharts") { %>active<% } %>"><a href="#flowcharts" data-toggle="pill" class="menu-opt-content"><span>Flowcharts</span><span class="glyphicon glyphicon-chevron-right menu-opt-accessory right"></span></a></li>' +
                                '<li class="profile-menu-opt menu-opt <% if (selectedSection == "following") { %>active<% } %>"><a href="#following" data-toggle="pill" class="menu-opt-content"><span>Following</span><span class="glyphicon glyphicon-chevron-right menu-opt-accessory right"></span></a></li>' +
                                '<li class="profile-menu-opt menu-opt <% if (selectedSection == "followers") { %>active<% } %>"><a href="#followers" data-toggle="pill" class="menu-opt-content"><span>Followers</span><span class="glyphicon glyphicon-chevron-right menu-opt-accessory right"></span></a></li>' +
                                //'<li class="profile-menu-opt menu-opt <% if (selectedSection == "Settings") { %>active<% } %>"><a href="#Settings" data-toggle="pill" class="menu-opt-content"><span>Settings</span><span class="glyphicon glyphicon-chevron-right menu-opt-accessory right"></span></a></li>' +
                            '</ul>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div id="profile-right-content" class="tab-content">' +
                    '<div id="summary" class="tab-pane <% if (selectedSection == "summary") { %>active<% } %>">' +
                        '<section>' +
                            '<div class="row" id="stat-wrapper">' +
                                '<div class="col-xs-12 col-sm-4 col-md-4 edge-left">' +
                                    '<div data-stat-link="flowcharts" class="stat-section stat-blue top stat-button">' +
                                        '<div class="stat-icon">' +
                                            '<img src="/static/omfiles/images/stat-charts.png">' +
                                        '</div>' +
                                        '<div class="stat-detail"><p class="stat-count"><%= user.get("created_charts").length %></p><p class="stat-name">Charts Created</p></div>' +
                                    '</div>' +
                                    '<div class="stat-section stat-yellow bottom">' +
                                        '<div class="stat-icon">' +
                                            '<img src="/static/omfiles/images/<%if (env.ip) { %>stat-votes<% } else { %>stat-share<% } %>.png">' +
                                        '</div>' +
                                        '<div class="stat-detail"><p class="stat-count"><%= user.get("upvotes_given") + user.get("downvotes_given") %></p><p class="stat-name"><%if (env.ip) { %>Votes Entered<% } else { %>Shares<% } %></p></div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="col-xs-12 col-sm-4 col-md-4">' +
                                    '<div data-stat-link="followers" class="stat-section stat-purple top stat-button">' +
                                        '<div class="stat-icon">' +
                                            '<img src="/static/omfiles/images/stat-followers.png">' +
                                        '</div>' +
                                        '<div class="stat-detail"><p class="stat-count"><%= user.get("followedby").length %></p><p class="stat-name">Followers</p></div>' +
                                    '</div>' +
                                    '<div data-stat-link="following" class="stat-section stat-pink bottom stat-button">' +
                                        '<div class="stat-icon">' +
                                            '<img src="/static/omfiles/images/stat-following.png">' +
                                        '</div>' +
                                        '<div class="stat-detail"><p class="stat-count"><%= user.get("following").length %></p><p class="stat-name">Following</p></div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="col-xs-12 col-sm-4 col-md-4 edge-right">' +
                                    '<div data-stat-link="flowcharts" data-stat-link-opt="voteHigh" class="stat-section stat-green top stat-button">' +
                                        '<div class="stat-icon">' +
                                            '<img src="/static/omfiles/images/stat-vote-pos.png">' +
                                        '</div>' +
                                        '<div class="stat-detail"><p class="stat-count"><%= user.get("upvotes_received") %></p><p class="stat-name">Positive Votes</p></div>' +
                                    '</div>' +
                                    '<div data-stat-link="flowcharts" data-stat-link-opt="voteLow" class="stat-section stat-red bottom stat-button">' +
                                        '<div class="stat-icon">' +
                                            '<img src="/static/omfiles/images/stat-vote-neg.png">' +
                                        '</div>' +
                                        '<div class="stat-detail"><p class="stat-count"><%= user.get("downvotes_received") %></p><p class="stat-name">Negative Votes</p></div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</section>' +
                        '<section id="summary-flowcharts">' +
                            '<header class="blue"><a class="header-link" href="#flowcharts"><h2 class="header-title">Flowcharts</h2><span class="more-link">More</span></a></header>' +
                            '<div class="row summary-section-container">' +
                            '</div>' +
                        '</section>' +
                        '<section id="summary-following">' +
                            '<header class="blue"><a class="header-link" href="#following"><h2 class="header-title">Following</h2><span class="more-link">More</span></a></header>' +
                            '<div class="row summary-section-container short">' +
                            '</div>' +
                        '</section>' +
                        '<section id="summary-followers">' +
                            '<header class="blue"><a class="header-link" href="#followers"><h2 class="header-title">Followers</h2><span class="more-link">More</span></a></header>' +
                            '<div class="row summary-section-container short">' +
                            '</div>' +
                        '</section>' +
                    '</div>' +
                    '<div id="flowcharts" class="tab-pane <% if (selectedSection == "flowcharts") { %>active<% } %>">' +
                        '<section>' +
                            '<header class="blue"><h2>Flowcharts</h2></header>' +
                            '<div class="section-container">' +
                            '</div>' +
                        '</section>' +
                    '</div>' +
                    '<div id="favorites" class="tab-pane <% if (selectedSection == "favorites") { %>active<% } %>">' +
                        '<section>' +
                            '<header class="blue"><h2>Favorites</h2></header>' +
                            '<div class="section-container">' +
                            '</div>' +
                        '</section>' +
                    '</div>' +
                    '<div id="following" class="tab-pane <% if (selectedSection == "following") { %>active<% } %>">' +
                        '<section>' +
                            '<header class="blue"><h2>Following</h2></header>' +
                            '<div class="row section-container">' +
                            '</div>' +
                        '</section>' +
                    '</div>' +
                    '<div id="followers" class="tab-pane <% if (selectedSection == "followers") { %>active<% } %>">' +
                        '<section>' +
                            '<header class="blue"><h2>Followers</h2></header>' +
                            '<div class="row section-container">' +
                            '</div>' +
                        '</section>' +
                    '</div>' +
                    /*'<div id="Settings" class="tab-pane <% if (selectedSection == "Settings") { %>active<% } %>">' +
                            '<header><h2>Settings</h2></header>' +
                            '<div class="change-password"><p><a href="<%=protocolString+rootURL%>/reset">Change Password</a></p></div>'+
                '</div>' +*/
            '</div>' +
        '</section>'
        )

});

App.CommunityView = Backbone.View.extend({
    el: "#appviewcontent",

    template: _.template(''+
        '<section class="middle-panel clearfix">'+
            '<div class="container">'+
                '<section class="community-box">'+
                '<div class="row">'+
   '<div class="col-lg-12">'+
   '<!-- Add youtube plug-in code here -->'+
   '<div class="placeholder-box">'+
   '<style>.embed-container { position: relative; padding-bottom: 56.25%; padding-top: 30px; height: 0; overflow: hidden; max-width: 100%; height: auto; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }</style><div class="embed-container"><iframe src="//www.youtube.com/embed/videoseries?list=PLAG3dmI1co3otrwKkkf15miLq4yrfOvOe" frameborder="0" allowfullscreen></iframe></div>'+
    '</div>'+
   '<!-- Add youtube plug-in code here ends -->'+
   '</div>'+
   '</div>'+
   '</section>'+
   '<!-- FAQ section div start here -->'+
   '<section class="">'+
      '<header class="blue clearfix">'+
      '<span class="left-txt">Frequently Asked Questions</span>'+
      '<span class="right-txt"> - <a href="mailto:help@properchannel.co">help@properchannel.co</a></span>'+
      '</header>'+
      '<div class="content-detail clearfix">'+
        '<div class="row clearfix">'+
          '<div class="col-md-12 col-sm-12">'+
          '<div class="panel-group" id="accordion">'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseOne">'+
          'What is the purpose of Proper Channel?'+
        '</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseOne" class="panel-collapse collapse in">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        '<div class="col-md-12 col-sm-12">'+
        '<p>Proper Channel is a community based system that allows for the easy creation of instructional flowcharts. These are built by users who want to make a difference. Every chart on Proper Channel details how to navigate a specific bureaucratic system; from getting a motorcycle license in Texas to opting a child out of Common Core testing in Florida, Proper Channel will be your first step when you need to navigate bureaucracy.</p>'+
        '</div>'+
        //'<div class="col-md-5 col-sm-5 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseTwo">What makes Proper Channel different from other instructional websites?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseTwo" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Proper Channel is leveraging the power of community. Our instructions aren\'t based on what a governmental branch thinks will work, but are created by people who actually had to work with the system. Our branching paths allow for detailed customization. This means our instructions aren\'t just created to show you a single path, but can map the branching decisions that come from the multiple real world ways used to find a solution. Anyone can view your work without logging-in, this means you\'ll be helping everyone from your next door neighbor to a Proper Channel user clear across the globe. The instructional seed you plant is editable by anyone. If someone else finds a new path and wants to add it to your instructional it\'s as easy as logging in. Your map navigating a school district change could grow into a tree mapping options for surrounding districts and beyond, making the potential to help your community self sustaining and endless.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseThree">What kind of flowcharts can I create?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseThree" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p>  Proper Channel wants to help people navigate the bureaucratic maze. If it involves a governmental office, we want to see it mapped out. Acquiring social services, adoption, licensing, immigration, receiving governmental aid, filing complaints, are all confusing processes. If you take the time to map out your experience with Proper Channel, others can expand on it. That initial trail of breadcrumbs will lay the foundation for a well traveled path through the governmental system, and help everyone who follows after.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseFour">How do I know the flowcharts are accurate?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseFour" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Though we don\'t directly monitor the chart creation, Proper Channel users are doing their best to point you in the right direction. Collaborative documentation has been shown to have a high level of accuracy and we\'ve included a counter on each page to show you how many users have approved of the chart you\'re currently using.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseFive">What is the benefit of registering an account with Proper Channel?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseFive" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Although you can currently create and edit a chart without an account, we want to give you credit. Creating an account will name you as a charts author, and we\'ll be adding many useful features for account holders in the future. This includes tracking features, storable drafts, and awards for users who\'ve done exceptional work mapping for their community. Account holders are also the only Proper Channel users allowed to vote on a chart\'s usability.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseSix">How do I register an account?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseSix" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Scroll over Login on the site menu. Click create account. Enter a username and email address you would like attached to your account. Enter your password and retype it. Click register. You have now registered an account with Proper Channel. Visit <a href=http://www.youtube.com/watch?v=v_l4QpTECy8 target=”_blank”>here</a> for a video tutorial.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseSeven">How do I build a flowchart?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseSeven" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Login to your account. Click Create new Flowchart, and start building. The Green Ovals are used for starting points, Blue Rectangles are used for single instructions, and Pink Diamonds are used for branching paths. Enter a Chart Title and remember to use keywords. Drag and drop the shapes anywhere on your chart. Click Add Text followed by any Instructional Shape to enter the Label Text and the detailed instructions under Secondary Text. To connect balloons click on Connect Shapes followed by the initial instruction, then secondary instruction. You\'ll see an arrow connecting the first Shape you clicked to the second. If you need to delete anything just click it and hit backspace, and to edit text simply click on the same options you used to input text. Make sure to save when you\'re done. Visit <a href=http://www.youtube.com/watch?v=8wdtIFIyYlo target=”_blank”> here</a> for an in-depth video tutorial. </p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseEight">Why is Shape Display Text limited?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseEight" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Our research has shown that busy flowcharts are just as overwhelming as text manuals, and it\'s Proper Channel\'s mission to make navigation simple. By restricting Shape Display Text we\'ve kept the flowcharts streamlined and glance able. There\'s always room in the Secondary Text Box for detail; this is where you can link to forms, add instructional videos, or warn users against common mistakes.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseNine">Can I add text to an arrow?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseNine" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p>  Yes, click “Add Text” followed by the arrow. These support secondary text just like the Shapes do.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseTen">Can I make an arrow bend?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseTen" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> We don\'t currently support this feature.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseEleven">Why won\'t my chart save?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseEleven" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Make sure your chart begins with a Green Oval, and that all arrows are pointing away from it.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseTwelve">I found a mistake in a Proper Channel chart, what should I do?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseTwelve" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Mistakes will happen when governmental processes change, and it\'s up to our community to document these changes when they occur. Simply log-in, click “Edit”, fix the chart and hit save. We rely on active community members to ensure that Proper Channel will be the largest and most accurate database of process knowledge in the world, and we can\'t do it without your help.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseThirteen">How do I find a chart?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseThirteen" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Our search function currently utilizes text. If the word or words you\'re searching for appear in the chart\'s title or elsewhere in the chart, it will come up in a search. You can also click “List” in the menu bar to view a list of all current charts. We\'ll be implementing categorical and location based search functions in the near future.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseFourteen">What do I do if I find a bug, or have an idea for a new feature?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseFourteen" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Thank you for your help! We are a small team, and are currently in a limited Beta test. We know there will be some kinks, and appreciate your help in identifying them. If you find any problems, or have any ideas on how to improve the site, don\'t hesitate to contact us at: info@properchannel.co</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseFifteen">How can I help?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseFifteen" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> We are a small team, and would love to have your support. The easiest way to do this is by using Proper Channel. Creating charts and sharing them with your friends gets the words out, and the more active users we have creating charts to share, the more our community will flourish. We are also looking to partner with large organizations to help them better connect with their users. If you know of an organization who is trying to educate users on a regular basis, we would love an introduction. If you are interested in joining the team we would be happy to set up a meeting. All inquiries can be sent to: info@properchannel.co </p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseSixteen">Where are you from?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseSixteen" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> Proper Channel started in the Boston/Cambridge area. We now have people helping from all over the country.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseSeventeen">I\'d love to use this for my business, who should I contact?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseSeventeen" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> We understand how valuable a simple, collaborative documentation tool can be for businesses. We would be happy to speak with you about solving your problems through a Proper Channel partnership. All inquiries can be sent to: info@properchannel.co</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="panel panel-default">'+
    '<div class="panel-heading">'+
      '<h4 class="panel-title">'+
        '<a data-toggle="collapse" data-parent="#accordion" href="#collapseEighteen">Why was my chart deleted?</a>'+
      '</h4>'+
    '</div>'+
    '<div id="collapseEighteen" class="panel-collapse collapse">'+
      '<div class="panel-body">'+
        '<div class="row">'+
        //'<div class="col-md-4 col-sm-4 img-txt"><img src="images/grap-img.jpg" alt=""></div>'+
        '<div class="col-md-12 col-sm-12">'+
        '<p> There are a number of reasons why this can happen. The community may down vote a chart enough for auto-deletion, or it may be mapping a process based on opinion. Proper Channel is focused on hard data. We want to show users how to navigate complicated systems with accurate, official steps. If a chart falls outside of the Proper Channel mission statement we will remove it.</p>'+
        '</div>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
'</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
   '</section>'+
   '<!-- FAQ section div ends here --> '+
  '</div>'+
'</section>'
        ),

    initialize: function() {
        dbgconsolelog("Initializing About View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }
        this.render();
        //if ($('.logo-section').css('display') == 'none') {
        //    $('.logo-section').show();
        //}
    },

    render: function() {
        dbgconsolelog("Rendering About View!");
        if ($('#appviewcontent').length < 1) {
            dbgconsolelog("Warning! No #appviewcontent!");
        }
        this.$el.html(this.template({
            //arrowurl: 'static/omfiles/images/search-arrow-right.png'
        }));
        return this;
    },


})

App.MyCanvasView = Backbone.View.extend({
    el: "#appviewcontent",

    events: {
        'click #savechart': 'saveChart',
        //'click #submit-title': 'submitTitle',
        //'click #editTitleButton': 'editTitle',
        //'click #removeTitleButton': 'removeTitle',
        'click #connecttool': 'connectTool',
        'click #addtext': 'addText',
        'click #deletetool': 'deleteTool',
        'click #publish': 'publishChart',
        'click .close-panel-button': 'closeSidebar'
        //'click #clearcanvas': 'clearCanvas'
    },

    closeSidebar: function(e) {
        e.preventDefault();


    },

    saveChart: function(e) {
        if(e && typeof(e) != undefined) {
            e.preventDefault()
        }
        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val();
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = JSON.stringify(canvas.toJSON(includeProps));
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        sendTags = JSON.stringify(_.extend({}, _.map($("input[data-role=tagsinput]").tagsinput('items'), function(e, i, l) { return e.replace(/\#/g, '').replace(/\s+/g, " ").trim(); })));
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "POST",
            url: '/api/charts',
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },

            success: function(resp) {
                //dbgconsolelog("Response was: ");
                //dbgconsolelog(resp);
                savetitle = resp.chart.title;
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                router.navigate('/chart/'+resp.chart.slug+'/edit', {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
        /*$.post('/api/charts', {
            'title': sendTitle,
            'chartobj': sendObj,
            'imgupload': sendDataURL
        })
            .done(function(data) {
                console.log("Data posted: " + JSON.stringify(data));
                $('.alert').addClass('alert-success');
                $('.alert').append("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button>Chart saved!");
                $('.alert').show();
                window.setTimeout(function() {
                    $(".alert").fadeOut();
                }, 3000);
                window.setTimeout(function() {
                    $(".alert").empty();
                }, 4000);
            })
            .fail(function(data) {
                var theerror = JSON.parse(data.responseText).message;
                console.log("Save failed! " + theerror);
                $('.alert').addClass('alert-danger alert-dismissable');
                $('.alert').append("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;</button>Save failed! " + theerror);
                $('.alert').show();
                window.setTimeout(function() {
                    $(".alert").fadeOut();
                }, 3000);
                window.setTimeout(function() {
                    $(".alert").empty();
                }, 4000);
            });*/
    },

    publishChart: function(e) {
        e.preventDefault();
        dbgconsolelog("Saving edits to chart with title " + chartTitle + "!");

        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val();
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = JSON.stringify(canvas.toJSON(includeProps));
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        canvas.renderAll();
        sendTags = JSON.stringify(_.extend({}, _.map($("input[data-role=tagsinput]").tagsinput('items'), function(e, i, l) { return e.replace(/\#/g, '').replace(/\s+/g, " ").trim(); })));
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "POST",
            url: '/api/charts',
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },

            success: function(resp) {
                dbgconsolelog(resp);
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                //router.navigate('/chart/'+thisslug, {trigger: true});
                router.navigate('/chart/'+resp.chart.slug, {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
    },

    submitTitle: function(e) {
        e.preventDefault();
        chartTitle = $("#inputTitle").val();
        $("#submitTitle").replaceWith("<div id=\x22chart-title-div\x22><h3>" + chartTitle + " \
    <span id=\x22titleEditGroup\x22><button type=\x22button\x22 id=\x22editTitleButton\x22 class=\x22btn btn-primary btn-sm\x22>Edit</button> \
    <button type=\x22button\x22 id=\x22removeTitleButton\x22 class=\x22btn btn-warning btn-sm\x22>Remove</button></span></h3></div>");

    },

    editTitle: function(e) {
        e.preventDefault();
        $("#chart-title-div").replaceWith("\
<form id=\x22submitTitle\x22 class=\x22form-inline\x22 role=\x22form\x22> \
<div class=\x22form-group\x22> \
<label class=\x22sr-only\x22 for=\x22inputTitle\x22>Enter a title for this chart</label> \
<input type=\x22text\x22 class=\x22form-control\x22 id=\x22inputTitle\x22 value=\x22" + chartTitle + "\x22> \
</div> \
<button type=\x22submit\x22 class=\x22btn btn-default\x22 id=\x22submit-title\x22>Submit</button> \
</form>");


    },

    removeTitle: function(e) {
        e.preventDefault();
        $("#chart-title-div").replaceWith("\
    <form id=\x22submitTitle\x22 class=\x22form-inline\x22 role=\x22form\x22> \
    <div class=\x22form-group\x22> \
    <label class=\x22sr-only\x22 for=\x22inputTitle\x22>Enter a title for this chart</label> \
    <input type=\x22text\x22 class=\x22form-control\x22 id=\x22inputTitle\x22 placeholder=\x22Enter a title for this chart\x22> \
    </div> \
    <button type=\x22submit\x22 class=\x22btn btn-default\x22 id=\x22submit-title\x22>Submit</button> \
    </form>");
    },

    connectTool: function(e) {
        e.preventDefault();

        if (currentTool !== tools.defaulttool && currentTool !== tools.connecttool) {
            tools.defaulttool();
        }

        usingTool = !usingTool;
        currentTool = (currentTool === tools.connecttool) ? tools.defaulttool : tools.connecttool;
        currentTool();
        dbgconsolelog("Connecttool is " + (tools.connecttool.started ? "" : "not ") + "started.");
    },

    addText: function(e) {
        e.preventDefault();

        if (currentTool !== tools.defaulttool && currentTool !== tools.addtext) {
            tools.defaulttool();
        }

        usingTool = !usingTool;
        currentTool = (currentTool === tools.addtext) ? tools.defaulttool : tools.addtext;
        currentTool();
    },

    deleteTool: function(e) {
        e.preventDefault();

        if (currentTool !== tools.defaulttool && currentTool !== tools.deletetool) {
            tools.defaulttool();
        }

        usingTool = !usingTool;
        currentTool = (currentTool === tools.deletetool) ? tools.defaulttool : tools.deletetool;
        currentTool();
    },

    clearCanvas: function(e) {
        e.preventDefault();
        dbgconsolelog("Clearing the canvas!");
        var items = canvas.getObjects();
        var toremove = [];
        for (var i = 0; i < items.length; i++) {
            var x = items[i];
            if (!(x.inSidebar) && (isShape(x) || isArrow(x) || isShapeGroup(x) || isGroupContainingNonSidebarShape(x) || isGroupContainingArrow(x))) {
                toremove.push(items[i]);
            }
        }
        for (var j = 0; j < toremove.length; j++) {
            dbgconsolelog(toremove[j]);
            canvas.remove(toremove[j]);
        }
        $("#connecttool").removeClass("active");
        $("#addtext").removeClass("active");
        usingTool = false;
        currentTool.started = false;
        currentTool = tools.defaulttool;
        currentTool();
    },

    addShapeMenu: function(shape) {
        dbgconsolelog("Adding shape menu!");
        var smv = new App.ShapeMenuView({
            model: shape
        });
        this.menuViews.push(smv);
        $('#contextmenus').append(smv.render().el);
        //dbgconsolelog("There are now " + $('.shapemenu').length + " shape menus");
    },

    addArrowMenu: function(arrow) {
        dbgconsolelog("Adding arrow menu!");
        var amv = new App.ArrowMenuView({
            model: arrow
        });
        this.menuViews.push(amv);
        $('#contextmenus').append(amv.render().el);
    },

    removeMenuViews: function() {
        this.getViewsLength();
        _.each(this.menuViews, function(menuView) {
            dbgconsolelog("Destroying menu view: " + menuView);
            dbgconsolelog("Secondary views: ");
            dbgconsolelog(menuView.secondaryviews);
            if (menuView.secondaryviews && menuView.secondaryviews.length > 0) {
                dbgconsolelog("Menu view has secondary views to remove");
                menuView.removeSecondaryViews();
            } else {
                dbgconsolelog("Menu view has no secondary views");
            }
            menuView.$el.empty();
            menuView.remove();
            menuView.unbind();
            menuView.undelegateEvents();
            this.menuViews = _.without(this.menuViews, menuView);
        });
        $('#secondarypopups').empty();
    },

    getViewsLength: function() {
        dbgconsolelog("There are " + this.menuViews.length + " menu views.");
        _.each(this.menuViews, function(menu) {
            dbgconsolelog("This menuview has " + menu.secondaryviews.length + " secondary views");
        });
    },

    template: _.template('' +
        '<section class="middle-panel loged-in-user clearfix">' +
            '<div class="chart-container container">' +
                '<div class="row">' +
                    '<div class="col-xs-12 text-center">' +
                        '<div class="edit-ui-section top" id="title-input-wrapper" >' +
                        //'<a href="#" id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click"><%= charttitle %></a>' +
                        //'<h3 id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click" style="display: inline"><%= charttitle %></h3>' +
                            '<div class="col-xs-10 title-input">' +
                                '<input type="text" class="text-center" id="inputTitle" value="<%= charttitle %>" placeholder="Untitled Guide" />' +
                            '</div>' +
                            '<div class="col-xs-2 text-center"><div class="pc-btn expand confirm filled" id="savechart"><span class="glyphicon glyphicon-save"></span> &nbsp;&nbsp;&nbsp;Save</div></div>' +
                            //'<div class="col-xs-2 text-center"><div class="pc-btn expand confirm filled" id="publish"><span class="glyphicon glyphicon-ok-sign"></span> &nbsp;&nbsp;&nbsp;Save & Exit</div></div>' +
                        '</div>' +
                        //'<input name="" value="" class="width-m" placeholder="Enter Chart Title Here" type="text">'+
                        /*'<div class="left-box">'+
                              '<select name="" class="country">'+
                                '<option>Country</option>'+
                                '<option>USA</option>'+
                                '<option>Uk</option>'+
                                '<option>India</option>'+
                              '</select>'+
                            '</div>'+
                            '<div class="left-box">'+
                              '<input name="" value="" class="width-s" placeholder="State / Province" type="text">'+
                            '</div>'+
                            '<div class="left-box">'+
                              '<input name="" value="" class="width-s" placeholder="City" type="text">'+
                            '</div>'+ */
                    '</div>' +
                '</div>' +
                '<div class="row">' +
                    '<div class="col-xs-12">' +
                        '<img src="/static/omfiles/images/ui-overlay.png" />' +
                    '</div>' +
                '</div>' +
                /*'<div class="row">' +
                    '<div class="col-xs-12">' +
                        '<div class="edit-ui-section" id="tagbox-wrapper" >' +
                            '<div class="col-xs-1 text-center">TAGS</div>' +
                            '<div class="col-xs-11 tagbox">' +
                                '<input type="text" <%= charttags %> data-role="tagsinput" placeholder="e.g. health, electronics, outdoors, work ...">'+
                            '</div>'+
                            //'<div class="col-xs-2 text-center"><div class="pc-btn green filled" id="savechart"><span class="glyphicon glyphicon-save"></span> Save Chart</div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="row offcanvas-wrapper offcanvas-wrapper-right">' +
                    '<div class="col-xs-12">' +
                        '<div class="work-space">' +
                            '<div class="row user-top-row">' +
                                '<div class="col-lg-12">' +
                                    '<div class="work-section">' +
                                        '<div class="container-canvas" id="new-canvas-wrapper">' +
                                            '<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                                            //'<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                                        '</div>' +
                                        '<div class="text-center" id="canvas-toolbox">' +
                                            '<div class="tool-button" id="connecttool"><span class="glyphicon glyphicon-arrow-right tool-button-icon"></span><br />Connect Shapes</div>' +
                                            '<div class="tool-button" id="addtext"><span class="glyphicon glyphicon-font tool-button-icon"></span><br />Add Text</div>' +
                                            '<div class="tool-button" id="deletetool"><span class="glyphicon glyphicon-remove tool-button-icon"></span><br />Delete Shape</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-lg-5 col-md-4 col-xs-10 offcanvas-sidebar"><div id="extras-sidebar">' +
                        '<div class="panel-header">' +
                            '<span class="panel-title">More Info</span>' +
                        '</div>' +
                        '<div class="panel-content"><h4 class="text-center">Click a shape in the chart for more information</h4></div>' +
                    '</div></div>' +
                '</div>' +*/
            '</div>' +
        '</section>'),

    initialize: function() {
        dbgconsolelog("Initializing MyCanvasView...");
        //this.$el.empty();
        shapecollection.destroyAll();
        //shapecollection.reset();
        arrowcollection.destroyAll();
        //arrowcollection.reset();
        this.menuViews = [];
        this.listenTo(shapecollection, 'add', this.addShapeMenu);
        this.listenTo(arrowcollection, 'add', this.addArrowMenu);
        /*if(!($('.logo-section').css('display') == 'none')) {
            $('.logo-section').hide();
        }*/
        $(document).ready(function() {
            $(window).off('resize.chartresize');
        });

        this.render();
        /*$('#inputTitle').editable({
            emptytext: "Untitled",
            success: function(response, newValue) {
                chartTitle = newValue;
            }
        });*/
    },

    render: function() {
        var that = this;
        dbgconsolelog("Rendering MyCanvasView");
        this.$el.html(this.template({
            shape1url: 'static/omfiles/images/shape-1.png',
            shape2url: 'static/omfiles/images/shape-2.png',
            shape3url: 'static/omfiles/images/shape-3.png',
            arrowurl: 'static/omfiles/images/arrow-img.png',
            texticonurl: 'static/omfiles/images/text-icon.png',
            charttitle: '',
            charttags: this.tagsToString()
        }));

        dispatcher.trigger('renderEvent');

        $(document).ready(function() {
            var inittags = function() {
                $("input[data-role=tagsinput], select[multiple][data-role=tagsinput]").tagsinput({ trimValue: true });
            };

            $('[data-toggle="tooltip"]').tooltip();

            defer = $.Deferred(inittags);
            defer.resolve();
            defer.done(function(){
                that.initTypeahead();
            })

        })
    },

    tagsToString: function() {
        return "value=\"\"";
    },

    initTypeahead: function() {
        var tags = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            limit: 10,
            prefetch: {
                url: protocolString+rootURL+'/api/tags',
                ttl: 20000,
                filter: function(list) {
                    return list['tags']
                }
            }
        });

        tags.initialize();

        $("input[data-role=tagsinput]").tagsinput('input').typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {
            name: 'tags',
            displayKey: 'name',
            source: tags.ttAdapter()
        }).bind('typeahead:selected', $.proxy(function (obj, datum) {
            this.tagsinput('add', datum.name);
            this.tagsinput('input').typeahead('val', '');
        }, $("input[data-role=tagsinput]")));
    }

});

App.NewChartView = Backbone.View.extend({
    el: "#appviewcontent",

    events: {
        'click #savechart': 'saveChart'
    },

    saveChart: function(e) {
        e.preventDefault();
        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val();
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = JSON.stringify(canvas.toJSON(includeProps));
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        sendTags = JSON.stringify(_.extend({}, _.map($("input[data-role=tagsinput]").tagsinput('items'), function(e, i, l) { return e.replace(/\#/g, '').replace(/\s+/g, " ").trim(); })));
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "POST",
            url: '/api/charts',
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },

            success: function(resp) {
                //dbgconsolelog("Response was: ");
                //dbgconsolelog(resp);
                savetitle = resp.chart.title;
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                router.navigate('/chart/'+resp.chart.slug+'/edit', {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
    },

    /*publishChart: function(e) {
        e.preventDefault();
        dbgconsolelog("Saving edits to chart with title " + chartTitle + "!");
        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val();
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = JSON.stringify(canvas.toJSON(includeProps));
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        canvas.renderAll();
        sendTags = JSON.stringify(_.extend({}, $("input[data-role=tagsinput]").tagsinput('items')));
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "POST",
            url: '/api/charts',
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },
            success: function(resp) {
                dbgconsolelog(resp);
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                //router.navigate('/chart/'+thisslug, {trigger: true});
                router.navigate('/chart/'+resp.chart.slug, {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },
            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
    },*/

    template: _.template('' +
        '<section class="middle-panel loged-in-user clearfix">' +
            '<div class="chart-container container">' +
                '<div class="row">' +
                    '<div class="col-xs-12 text-center">' +
                        '<div class="edit-ui-section top" id="title-input-wrapper" >' +
                        //'<a href="#" id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click"><%= charttitle %></a>' +
                        //'<h3 id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click" style="display: inline"><%= charttitle %></h3>' +
                            '<div class="col-xs-10 title-input">' +
                                '<input type="text" class="text-center" id="inputTitle" value="" placeholder="Untitled Guide" autofocus />' +
                            '</div>' +
                            '<div class="col-xs-2 text-center"><div class="pc-btn expand confirm filled" id="savechart"><span class="glyphicon glyphicon-save"></span> &nbsp;&nbsp;&nbsp;Save</div></div>' +
                            //'<div class="col-xs-2 text-center"><div class="pc-btn expand confirm filled" id="publish"><span class="glyphicon glyphicon-ok-sign"></span> &nbsp;&nbsp;&nbsp;Save & Exit</div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="row">' +
                    '<div class="col-xs-12">' +
                        '<div class="container-canvas" id="new-canvas-wrapper">' +
                            '<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                            //'<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                            '<img id="ui-overlay" src="/static/omfiles/images/ui-overlay.png" />' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</section>'),

    initialize: function() {
        $(document).ready(function() {
            $(window).off('resize.chartresize');
        });

        this.render();
    },

    render: function() {
        var that = this;
        this.$el.html(this.template({
            shape1url: 'static/omfiles/images/shape-1.png',
            shape2url: 'static/omfiles/images/shape-2.png',
            shape3url: 'static/omfiles/images/shape-3.png',
            arrowurl: 'static/omfiles/images/arrow-img.png',
            texticonurl: 'static/omfiles/images/text-icon.png',
            charttitle: ''
            //charttags: this.tagsToString()
        }));
        newCanvasInit();
        addCanvasUI();

        dispatcher.trigger('renderEvent');

        /*$(document).ready(function() {
            var inittags = function() {
                $("input[data-role=tagsinput], select[multiple][data-role=tagsinput]").tagsinput();
            };
            $('[data-toggle="tooltip"]').tooltip();

            defer = $.Deferred(inittags);
            defer.resolve();
            defer.done(function(){
                that.initTypeahead();
            })

        })*/
    }

});


/*
App.NewChartView = Backbone.View.extend({
events: {
'click': 'newChart'
},
newChart: function(){
router.navigate("new");
}
});
App.ListButtonView = Backbone.View.extend({
events: {
'click': 'listCharts'
},
listCharts: function(){
router.navigate("list", {trigger: true});
}
});
*/

App.ChartView = Backbone.View.extend({

    render: function() {
        this.$el.html(this.template(this.model.attributes));
        return this;
    },

    /*template: _.template('' +
        '<div class="row row-pad">' +
        '<div class="col-md-5 col-sm-5 left-det">' +
        '<h3 class="head-serch"><a href="/chart/<%= slug %>"><%= title %></a></h3>' +
        //'<h6 class="srch-li-title">USA, Massachusetts, Middlesex, Any</h6>' +
        '<h6 class="auther-detail">By: <a href="#"><%= created_by_name %></a></h6>' +
        '</div>' +
        '<div class="col-md-5 col-sm-5">'+
        '<div class="tagshowbox">'+
                '<% _.each(this.model.get("tags"), function(i) { %>  <span class="label label-primary"><%= i %></span> <% }); %>'+
            '</div>'+
            '</div>'+
        '<div class="col-md-2 col-sm-2"><div class="right-txt"><span class="green"><%= positive_votes %></span> / <span class="red"><%= negative_votes %></span></div></div>' +
        '</div>')
    //'<button id="editchart" type="button" class="btn btn-primary btn-sm" href="/chart/<%= slug %>/edit">Edit</button></p>'+*/
    template: _.template('' +
                '<div class="col-xs-12 col-sm-6 col-md-6 col-lg-3">'+
                        '<div class="sample-wrapper">'+
                            '<div class="sample-title text-center"><a href="<%= "/chart/"+slug %>"><%= title %></a></div>'+
                            '<div class="sample-thumb"><a href="<%= "/chart/"+slug %>"><img src="http://s3.amazonaws.com/properchannel-img/<%= imgurl %>" /></a></div>'+
                            '<div class="sample-info"><div class="sample-author">by <a href="/profile/<%= created_by_name %>" class="sample-author-name"><%= created_by_name %></a></div></div>'+
                            '<div class="sample-success"><%= positive_votes - negative_votes %></div>'+
                        '</div>'+
                '</div>')
});

App.SearchChartView = Backbone.View.extend({

    render: function() {
        /*this.$el.html(this.template(this.model.attributes));
        return this;*/
        return this.template(this.model.attributes);
    },

    /*template: _.template('' +
        '<div class="row row-pad">' +
        '<div class="col-md-3 col-sm-3 left-det">' +
        '<h3 class="head-serch"><a href="/chart/<%= slug %>"><%= title %></a></h3>' +
        //'<h6 class="srch-li-title">USA, Massachusetts, Middlesex, Any</h6>' +
        '<h6 class="auther-detail">By: <a href="#"><%= created_by_name %></a></h6>' +
        '</div>'+
        '<div class="col-md-2 col-sm-2">' +
        '<div class="tagshowbox">'+
                '<% _.each(this.model.get("tags"), function(i) { %>  <span class="label label-primary"><%= i %></span> <% }); %>'+
            '</div>'+
        '</div>' +
        '<div class="col-md-5 col-sm-5"><p><%=snippet_text%>...</p></div>'+
        '<div class="col-md-2 col-sm-2"><div class="right-txt"><span class="green"><%= positive_votes %></span> / <span class="red"><%= negative_votes %></span></div></div>' +
        '</div>')*/

    template: _.template('' +
                '<div class="col-xs-12 col-sm-6 col-md-6 col-lg-3">'+
                        '<div class="sample-wrapper">'+
                            '<div class="sample-title text-center"><a href="<%= "/chart/"+slug %>"><%= title %></a></div>'+
                            '<div class="sample-thumb"><a href="<%= "/chart/"+slug %>"><img src="http://s3.amazonaws.com/properchannel-img/<%= imgurl %>" /></a></div>'+
                            '<div class="sample-info"><div class="sample-author">by <a href="/profile/<%= created_by_name %>" class="sample-author-name"><%= created_by_name %></a></div></div>'+
                            '<div class="sample-success"><%= positive_votes - negative_votes %></div>'+
                        '</div>'+
                '</div>')
    //'<button id="editchart" type="button" class="btn btn-primary btn-sm" href="/chart/<%= slug %>/edit">Edit</button></p>'+
});

App.SearchListView = Backbone.View.extend({
    el: $('#appviewcontent'),

    //chart.created_at.strftime('%H:%M %Y-%m-%d')

    events: {
        'click #searchbutton': 'getSearchResults',
        'keypress #searchbox': 'getSearchResultsOnEnter'
    },

    initialize: function(options) {
        this.query = options.query || '';
        this.tags = options.tags || [];
        this.querystring = '';

        if (this.query.length) {
            this.querystring += 'query='+this.query;
        }

        this.querystring += this.querystring.length &&  this.tags.length ? '&' : '';

        for (var tag=0; tag < this.tags.length; tag++) {
            this.querystring += this.querystring.length ? '&tag='+this.tags[tag] : 'tag='+this.tags[tag];
        }

        this.collection = new App.SearchChartsCollection({ querystring: this.querystring });
        this.render();
    },

    render: function() {
        /*this.$el.html(this.template({
            chartlisttitle: "Search Results"
        }));*/
        /*var _this = this;
        $.ajax({
            url: "/api/search?query="+this.querystring,
            statusCode: {
                400: function (jqXHR) {
                    dbgconsolelog("Rendering failed template");
                    dbgconsolelog(jqXHR.responseJSON.message);
                    _this.renderFailed(jqXHR.responseJSON.message);
                }
            }
        }).done(function(data) {
            dbgconsolelog(data);
            if(data.message === "OK") {
                _this.fetchCollectionAndRender();
            }
            else {
                dbgconsolelog("Rendering corrected template");
                _this.renderCorrected(data.message);
            }
        });*/


        var _this = this;

        //container.empty();

        var chartCollectionView = new App.ChartCollectionView({
            chartContainer: '#listcont',
            chartCollection: _this.collection,
            isSearch: true,
            initialSort: 'relevance',
            renderParent: function() {
                _this.$el.html(_this.template({
                    chartlisttitle: "Search Results"
                }));

                /*else {
                    // TODO: Refactor result appending into the template instead of after it
                    _this.$el.html(_this.template({
                        chartlisttitle: "Search Results"
                    }));
                    $('#listcont').append(_this.correctedtemplate({themessage: message}));
                    _.each(_this.collection.models, function(chart) {
                        dbgconsolelog("Showing " + chart.get('title'));
                        var chartView = new App.SearchChartView({
                            model: chart
                        });
                        dbgconsolelog(chartView.$el);
                        $('#listcont').append(chartView.render());
                    }, this);
                }*/
            },

            onFetchSuccess: function(collection, response, opts) {
                if (response.message && response.message != "OK")
                    $('#resultMessage').html(_this.searchfailtemplate({message: response.message}));
            },

            onFetchFail: function(collection, response, opts) {
                $('#resultMessage').html(_this.correctedtemplate({message: response.message}));
            },

            afterPopulate: function() {
                if(_this.collection.models.length < 1) {
                    dbgconsolelog("No results found, querystring was: ");
                    dbgconsolelog(_this.querystring);
                    // TODO: Refactor result appending into the template instead of after it

                    $('#resultMessage').html(_this.notfoundtemplate({query: _this.query, tags: _this.tags}));
                    $('#listcont').empty();
                }
                $(document).ready(function(){
                    $(function() {
                        $('#search-form').submit(function(e) {
                            e.preventDefault();
                            $('#searchbox').trigger($.Event('keypress', {which: 13}));
                        });
                    });

                    // Add Result Suggestion to search field
                    $('#searchbox').devbridgeAutocomplete({
                        serviceUrl: '/api/suggest',
                        minChars: 2,
                        deferRequestBy: 100,
                        dataType: 'json',
                        onSelect: function(suggestion) {
                            router.navigate("chart/"+suggestion.data.slug, {trigger: true});  
                        },
                        transformResult: function(response) {
                            return {
                                suggestions: $.map(response.charts, function(dataItem) {
                                    return { value: dataItem.title, data: dataItem };
                                })
                            };
                        },
                        formatResult: function(suggestion, currentValue){
                            var posneg = (suggestion.data.positive_votes-suggestion.data.negative_votes) >= 0 ? 'positive' : 'negative';
                            return  '<div class="suggestion-sample-wrapper">'+
                                        '<div class="suggestion-sample-info">'+
                                            '<div class="suggestion-sample-title text-center vertical-align-wrapper '+posneg+'">'+
                                                '<span class="vertical-middle">'+suggestion.value+'</span>'+
                                            '</div>'+
                                            '<div class="suggestion-sample-success text-center vertical-align-wrapper '+posneg+'">'+
                                                '<span class="vertical-middle">'+(suggestion.data.positive_votes-suggestion.data.negative_votes)+'</span>'+
                                            '</div>'+
                                        '</div>' +
                                    '</div>';
                        }
                    });
                });

                dispatcher.trigger('renderEvent');
            }
        });
        chartCollectionView.render();

        return this;
    },

    template: _.template('' +
        '<section class="middle-panel search-result clearfix">' +
            '<div class="container">' +
                '<div class="row">' +
                    '<div class="col-xs-12 text-center" >'+
                    '<h2><%= chartlisttitle %></h2>' +
                    '</div>'+
                '</div>' +
                '<div class="row" id="resultMessage"></div>' +
                '<div class="cont" id="listcont">' +
                '</div>' +
            '</div>' +
        '</section>'),

    getSearchResults: function(e) {
        e.preventDefault();
        dbgconsolelog("Clicked search! Text to search for was: " + $('#searchbox').val());
        var query = {query: $('#searchbox').val()};

        var parsedQuery = parseSearchQuery(query.query);

        var queryPath = "";
        queryPath += parsedQuery['query'] ? "/query/"+parsedQuery['query'] : "";
        queryPath += parsedQuery['tags'] ? "/tags/"+parsedQuery['tags'] : "";

        router.navigate("search"+queryPath, {trigger: true});
    },

    getSearchResultsOnEnter: function(e) {
        if(e.which === 13) {
            this.getSearchResults(e);
        }
    },

    renderFailed: function(thismessage) {
        $('#listcont').append(this.searchfailtemplate({message: thismessage}));
    },

    notfoundtemplate: _.template('<div class="col-xs-12"><h4>No results for <em>TEXT: <strong><%= query %></strong><% if (tags.length) { %> and TAGS: <strong><%= tags.join(", ") %></strong><% } %></em></h4></div>'),

    correctedtemplate: _.template('<div class="col-xs-12"><h4><%= themessage %></h4></div>'),

    searchfailtemplate: _.template('<div class="col-xs-12"><h4><%= message %></h4></div>')

});

App.ChartEditView = App.MyCanvasView.extend({
    events: {
        'click #savechart': 'saveChart',
        'click #connecttool': 'connectTool',
        'click #addtext': 'addText',
        'click #deletetool': 'deleteTool',
        'click #publish': 'publishChart'
    },

    template: _.template('' +
        '<section class="middle-panel loged-in-user clearfix">' +
            '<div class="chart-container container">' +
                '<div class="row">' +
                    '<div class="col-xs-12 text-center">' +
                        '<div class="edit-ui-section top" id="title-input-wrapper" >' +
                        //'<a href="#" id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click"><%= charttitle %></a>' +
                        //'<h3 id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click" style="display: inline"><%= charttitle %></h3>' +
                            '<div class="col-xs-9 title-input">' +
                                '<input type="text" class="text-center" id="inputTitle" value="<%= charttitle %>" placeholder="Untitled Guide" />' +
                            '</div>' +
                            '<div class="col-xs-1 text-center"><div class="pc-btn expand confirm filled" id="savechart"><span class="glyphicon glyphicon-save"></span> &nbsp;&nbsp;&nbsp;Save</div></div>' +
                            '<div class="col-xs-2 text-center"><div class="pc-btn expand confirm filled" id="publish"><span class="glyphicon glyphicon-ok-sign"></span> &nbsp;&nbsp;&nbsp;Save & Exit</div></div>' +
                        '</div>' +
                        //'<input name="" value="" class="width-m" placeholder="Enter Chart Title Here" type="text">'+
                        /*'<div class="left-box">'+
                              '<select name="" class="country">'+
                                '<option>Country</option>'+
                                '<option>USA</option>'+
                                '<option>Uk</option>'+
                                '<option>India</option>'+
                              '</select>'+
                            '</div>'+
                            '<div class="left-box">'+
                              '<input name="" value="" class="width-s" placeholder="State / Province" type="text">'+
                            '</div>'+
                            '<div class="left-box">'+
                              '<input name="" value="" class="width-s" placeholder="City" type="text">'+
                            '</div>'+ */
                    '</div>' +
                '</div>' +
                '<div class="row">' +
                    '<div class="col-xs-12">' +
                        '<div class="edit-ui-section" id="tagbox-wrapper" >' +
                            '<div class="col-xs-1 text-center">TAGS</div>' +
                            '<div class="col-xs-11 tagbox">' +
                                '<input type="text" <%= charttags %> data-role="tagsinput" placeholder="e.g. health, electronics, outdoors, work ...">'+
                            '</div>'+
                            //'<div class="col-xs-2 text-center"><div class="pc-btn green filled" id="savechart"><span class="glyphicon glyphicon-save"></span> Save Chart</div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                /*'<div class="row">' +
                    '<div class="col-xs-12 btns">' +
                        '<div class="float-r">' +
                            '<div class="flot-box"><a href="#" class="gray" id="savechart">Save</a></div>' +
                            //'<div class="flot-box"><a href="#" class="gray">New/Copy</a></div>' +
                            '<div class="flot-box" id="connecttool"><a href="#" class="gray">Connect Shapes</a></div>' +
                            '<div class="flot-box" id="addtext"><a href="#" class="gray">Add Text</a></div>' +
                            //'<div class="flot-box" id="clearcanvas"><a href="#" class="gray">Clear Canvas</a></div>' +
                            //'<div class="flot-box"><a href="#" class="dropdown-toggle gray" data-toggle="dropdown">Share</a>'+
                            //'<ul class="dropdown-menu">'+
                            //'<li><a href="#">Facebook</a></li>'+
                            //'<li><a href="#">Twitter</a></li>'+
                            //'<li><a href="#">Dropbox</a></li>'+
                            //'<li><a href="#">Google Drive</a></li>'+
                            //'</ul>'+
                            //'</div>'+
                        '</div>' +
                    '</div>' +
                '</div>' +*/
                '<div class="row offcanvas-wrapper offcanvas-wrapper-right">' +
                    '<div id="toast-wrapper">' +
                        '<div id="toast-container"></div>' +
                    '</div>' +
                    '<div class="col-xs-12">' +
                        '<div class="work-space">' +
                            '<div class="row user-top-row">' +
                                '<div class="col-lg-12">' +
                                    '<div class="work-section">' +
                                        '<div class="container-canvas" id="edit-canvas-wrapper">' +
                                            '<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                                            //'<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                                        '</div>' +
                                        '<div class="text-center" id="canvas-toolbox">' +
                                            '<div class="tool-button" id="connecttool"><span class="glyphicon glyphicon-arrow-right tool-button-icon"></span><br />Connect Shapes</div>' +
                                            '<div class="tool-button" id="addtext"><span class="glyphicon glyphicon-font tool-button-icon"></span><br />Add Text</div>' +
                                            '<div class="tool-button" id="deletetool"><span class="glyphicon glyphicon-remove tool-button-icon"></span><br />Delete Shape</div>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-lg-5 col-md-4 col-xs-10 offcanvas-sidebar"><div id="extras-sidebar" class="sidebar-content">' +
                        '<div class="panel-header">' +
                            '<span class="panel-title">More Info</span>' +
                        '</div>' +
                        '<div class="panel-content"><h4 class="text-center">Click a shape in the chart for more information</h4></div>' +
                    '</div></div>' +
                '</div>' +
            '</div>' +
        '</section>'),

    saveChart: function(e) {
        if(e && typeof(e) !== undefined) {
            e.preventDefault();
        }
        dbgconsolelog("Saving edits to chart with title " + chartTitle + "!");

        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val(); //chartTitle;
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = JSON.stringify(canvas.toJSON(includeProps));
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        sendTags = JSON.stringify(_.extend({}, _.map($("input[data-role=tagsinput]").tagsinput('items'), function(e, i, l) { return e.replace(/\#/g, '').replace(/\s+/g, " ").trim(); })));
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "PUT",
            url: '/api/chart/' + this.model.get('slug'),
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },

            success: function(resp) {
                dispatcher.trigger('editSavedEvent');
                dbgconsolelog(resp);
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
    },

    publishChart: function(e) {
        var thisslug = this.model.get('slug');
        e.preventDefault();
        dbgconsolelog("Saving edits to chart with title " + chartTitle + "!");

        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val();
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = JSON.stringify(canvas.toJSON(includeProps));
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        canvas.renderAll();
        sendTags = JSON.stringify(_.extend({}, _.map($("input[data-role=tagsinput]").tagsinput('items'), function(e, i, l) { return e.replace(/\#/g, '').replace(/\s+/g, " ").trim(); })));
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "PUT",
            url: '/api/chart/' + this.model.get('slug'),
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },

            success: function(resp) {
                dbgconsolelog(resp);
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                router.navigate('/chart/'+thisslug, {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
    },

    initialize: function() {
        /*this.on('renderEvent', function() {
            canvas.renderAll();
        });*/
        var copiedObject,
        _this = this;

        $(document).ready(function() {
            $(window).off('resize.chartresize');
        });

        $(document).on('keydown.chartedit', function(e) {
            var nodeName = e.target.nodeName.toLowerCase();

            if (e.which === 8 && !((nodeName === 'input' && (e.target.type === 'text' || e.target.type === 'url')) || (nodeName === 'textarea') ||
                (nodeName === 'input' && e.target.type === 'search') || (nodeName === 'input' && e.target.type === 'password') ||
                $(e.target).hasClass('froala-view'))) {
                e.preventDefault();
            }

            if (typeof canvas !== 'undefined') {
                selectedObject = canvas.getActiveObject();

                if (_.contains([8, 46, 100, 127], e.which) && (isArrow(selectedObject) || isGroupContainingArrow(selectedObject))) {
                    e.preventDefault();
                    var thearrowid = selectedObject.arrowId;
                    deleteArrow(selectedObject);
                    arrowcollection.get(thearrowid).destroy();
                    canvas.deactivateAll();
                } else if (_.contains([8, 46, 100, 127], e.which) && isGroupContainingNonSidebarShape(selectedObject)) {
                    e.preventDefault();
                    var innershape = getShapeFromGroup(selectedObject);
                    if (innershape.type != 'pcrect') {
                        var innershapeid = innershape.shapeId;
                        deleteShape(selectedObject);
                        //dbgconsolelog("Shape collection is: " + shapecollection);
                        //dbgconsolelog("Shape to delete is: " + innershape + " id is: " + innershapeid);
                        //dbgconsolelog("Remove item: " + shapecollection.get(innershapeid));
                        shapecollection.get(innershapeid).destroy();
                    }
                    canvas.deactivateAll();
                } else if (_.contains([8, 46, 100, 127], e.which) && isNonSidebarShape(selectedObject)) {
                    e.preventDefault();
                    var innershape = selectedObject;
                    if (innershape.type != 'pcrect') {
                        var innershapeid = innershape.shapeId;
                        deleteShape(selectedObject);
                        //dbgconsolelog("Shape collection is: " + shapecollection);
                        //dbgconsolelog("Shape to delete is: " + innershape + " id is: " + innershapeid);
                        //dbgconsolelog("Remove item: " + shapecollection.get(innershapeid));
                        shapecollection.get(innershapeid).destroy();
                    }
                    canvas.deactivateAll();
                } else if (e.which == 67 && (e.ctrlKey || e.metaKey) && !((nodeName === 'input' && (e.target.type === 'text' || e.target.type === 'url')) || (nodeName === 'textarea') ||
                (nodeName === 'input' && e.target.type === 'search') || (nodeName === 'input' && e.target.type === 'password') ||
                ($(e.target).hasClass('froala-view')))) {
                    e.preventDefault();
                    if(isNonSidebarShape(selectedObject) && selectedObject.type != 'pcrect') {
                        _this.copyShape(selectedObject);
                    }
                } else if (e.which == 86 && (e.ctrlKey || e.metaKey) && !((nodeName === 'input' && (e.target.type === 'text' || e.target.type === 'url')) || (nodeName === 'textarea') ||
                (nodeName === 'input' && e.target.type === 'search') || (nodeName === 'input' && e.target.type === 'password') ||
                ($(e.target).hasClass('froala-view')))) {
                    e.preventDefault();
                    _this.pasteShape();
                }
            }
        });

        this.$el.empty();
        shapecollection.destroyAll();
        shapecollection.reset();
        arrowcollection.destroyAll();
        //arrowcollection.reset();
        this.menuViews = [];
        this.listenTo(shapecollection, 'add', this.addShapeMenu);
        this.listenTo(arrowcollection, 'add', this.addArrowMenu);
        this.listenTo(dispatcher, 'labelTextChangedEvent', this.saveChart);
        this.render();
        this.addRevisions();
        /*$('#inputTitle').editable({
            emptytext: "Click here to add a title",
            success: function(response, newValue) {
                chartTitle = newValue;
            }
        });*/
    },

    render: function() {
        var that = this;
        dbgconsolelog("Chart render called!");
        //console.trace();
        this.$el.html(this.template({
            shape1url: '../../static/omfiles/images/shape-1.png',
            shape2url: '../../static/omfiles/images/shape-2.png',
            shape3url: '../../static/omfiles/images/shape-3.png',
            arrowurl: '../../static/omfiles/images/arrow-img.png',
            texticonurl: '../../static/omfiles/images/text-icon.png',
            charttitle: this.model.get('title'),
            charttags: this.tagsToString()
        }));
        chartTitle = this.model.get('title');

        newCanvasInit();
        dbgconsolelog(this.model.get('chartobj'));
        $.when(canvas.loadFromJSON(this.model.get('chartobj'), canvas.renderAll.bind(canvas), function(o, object) {
            if (object.type === 'pcarrow') {
                dbgconsolelog("Arrow " + JSON.stringify(o) + " became object " + JSON.stringify(object.toJSON()));
            }
        })).done(function() {
            canvas.calcOffset();
            resetObjectCoords();
            dbgconsolelog("All done! Ready to create menus");
            canvas.forEachObject(function(o) {
                if (isGroupContainingNonSidebarShape(o)) {
                    var innerShape = getShapeFromGroup(o);

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isNonSidebarShape(o)) {
                    var innerShape = o;

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isArrow(o)) {
                    arrowcollection.create({
                        id: o.arrowId
                    });
                }
                if ($('#dropdown-1').length != 0) {
                    dbgconsolelog("Dropdown 1 seen!");
                } else {
                    dbgconsolelog("Dropdown 1 not seen!")
                };
            });

            window.setTimeout(setAllObjCoords,500);
        });
        addCanvasUI();
        this.addRightClickPasteMenu();
        //this.trigger('renderEvent');
        dispatcher.trigger('renderEvent');

        $(document).ready(function() {
            var inittags = function() {
                $("input[data-role=tagsinput], select[multiple][data-role=tagsinput]").tagsinput({ trimValue: true });
            };

            defer = $.Deferred(inittags);
            defer.resolve();
            defer.done(function(){
                that.initTypeahead();
            })

        })
    },

    addRightClickPasteMenu: function() {
        var _this = this;
        var rctemplate = _.template('\
            <ul id="dropdown-pastemenu" class="dropdown-menu" role="menu" style:"display:none"><li><a tabindex="-1" href="#" class="pastefrommenu">Paste</a></li></ul>');
        $('#contextmenus').append(rctemplate());
        $('a.pastefrommenu').click(function(e) {
            e.preventDefault();
            _this.pasteShapeFromMenu(pasteX,pasteY);
        })
    },

    copyShape: function() {
        dbgconsolelog("Got request to copy shape");
        copiedObject = selectedObject.clone();
        copiedObject.set({
            "top": copiedObject.top - 10,
            "left": copiedObject.left - 10,
            "arrowsIn": [],
            "arrowsOut": [],
            "follows": [],
            "followedBy": [],
            "shapeId": getNextObjID()
            });
        dbgconsolelog(copiedObject);
    },

    pasteShape: function() {
        if(typeof copiedObject !== 'undefined') {
            if(isNonSidebarShape(copiedObject)) {
                canvas.add(copiedObject);
                shapecollection.create({
                    id: copiedObject.shapeId,
                    typename: copiedObject.get('type')
                });
            }
        }
        dbgconsolelog("Got request to paste shape");
    },

    pasteShapeFromMenu: function(x,y) {
        if(typeof copiedObject !== 'undefined') {
            if(isNonSidebarShape(copiedObject)) {
                //console.log("top: "+y);
                //console.log("left: "+x);
                copiedObject.set({
                    "top": y,
                    "left": x
                });
                canvas.add(copiedObject);
                shapecollection.create({
                    id: copiedObject.shapeId,
                    typename: copiedObject.get('type')
                });
            }
        }
        //console.log("Got request to paste shape");
    },

    tagsToString: function() {
        if(this.model.get('tags').length < 1) {
            return "value=\"\"";
        } else {
            return "value=\""+this.model.get('tags')+"\"";
        }
    },

    initTypeahead: function() {
        var tags = new Bloodhound({
          datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          limit: 10,
          prefetch: {
            url: protocolString+rootURL+'/api/tags',
            ttl: 20000,
            filter: function(list) {
                return list['tags']
            }
        }
    });

        tags.initialize();

        $("input[data-role=tagsinput]").tagsinput('input').typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {
            name: 'tags',
            displayKey: 'name',
            source: tags.ttAdapter()
        }).bind('typeahead:selected', $.proxy(function (obj, datum) {
            this.tagsinput('add', datum.name);
            this.tagsinput('input').typeahead('val', '');
        }, $("input[data-role=tagsinput]")));
    },

    addRevisions: function() {
        this.revisionsView = new App.RevisionsView({model: this.model});
        $('.chart-container').append(this.revisionsView.render().el);
        //console.log("Appended revisions");
    },

    removeRevisionsView: function() {
        this.revisionsView.$el.empty();
        this.revisionsView.stopListening();
        this.revisionsView.unbind();
        this.revisionsView.undelegateEvents();
    }

});

App.RevisionsView = Backbone.View.extend({
    initialize: function() {
        var that = this;
        //console.log("Slug is " + this.model.get('slug'));
        this.revisions = new App.RevisionObjectCollection({chartslug: this.model.get('slug')});
        this.revisions.fetch({
            success: function() {
                that.revisions.setLatest();
                that.render();
            }
        });
        this.listenTo(dispatcher, 'editSavedEvent', function() {
            that.revisions.fetch({
                reset: true,
                success: function() {
                    that.revisions.setLatest();
                    that.render();
                }
            })
        });
    },

    render: function() {
        var columns = [{
            name: "version",
            label: "Version ID",
            editable: false,
            cell: "integer"
        }, {
            name: "action",
            label: "Action",
            editable: false,
            cell: "string"
        }, {
            name: "created_iso",
            label: "Revised At",
            editable: false,
            cell: Backgrid.Extension.MomentCell.extend({
                modelInUTC: true,
                displayInUTC: false,
                displayFormat: "MMM DD, YYYY hh:mm A"
            })
        }, {
            name: "revised_by",
            label: "Revised By",
            editable: false,
            cell: "string"
        }, {
            name: "view_link",
            label: "View Link",
            editable: false,
            cell : Backgrid.UriCell.extend({"displayText" : "View this version" })
        }];

        var grid = new Backgrid.Grid({
            columns: columns,
            collection: this.revisions
        })
        this.$el.html(this.template());
        grid.render().sort('version', 'descending');
        $('#revision-table').append(grid.el);
        return this;
    },

    //template: _.template('<% _.each(revisions.models, function(r) { %> <p><%= r.get("action") %>, <%= r.get("created_iso") %>, <%= r.get("revised_by") %></p> <% }); %>')
    template: _.template('<div id="revision-table" class="backgrid-container"></div>')

    //template: _.template('<% _.each([0,1,2,3,4], function(i) { %>  <p><%= i %></p> <% }); %>')

});

App.ChartCloneView = Backbone.View.extend({
    el: "#appviewcontent",

    events: {
        'click #savechart': 'saveChart'
    },

    saveChart: function(e) {
        if(e && typeof(e) !== undefined) {
            e.preventDefault();
        }

        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val();
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = this.model.get('chartobj');
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        sendTags = this.model.get('tags');
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "POST",
            url: '/api/charts',
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },

            success: function(resp) {
                //dbgconsolelog("Response was: ");
                //dbgconsolelog(resp);
                savetitle = resp.chart.title;
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                router.navigate('/chart/'+resp.chart.slug+'/edit', {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
    },

    template: _.template('' +
        '<section class="middle-panel loged-in-user clearfix">' +
            '<div class="chart-container container">' +
                '<div class="row">' +
                    '<div class="col-xs-12 text-center">' +
                        '<div class="edit-ui-section top" id="title-input-wrapper" >' +
                        //'<a href="#" id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click"><%= charttitle %></a>' +
                        //'<h3 id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click" style="display: inline"><%= charttitle %></h3>' +
                            '<div class="col-xs-10 title-input">' +
                                '<input type="text" class="text-center" id="inputTitle" value="" placeholder="Untitled Guide" autofocus />' +
                            '</div>' +
                            '<div class="col-xs-2 text-center"><div class="pc-btn expand confirm filled" id="savechart"><span class="glyphicon glyphicon-save"></span> &nbsp;&nbsp;&nbsp;Save</div></div>' +
                            //'<div class="col-xs-2 text-center"><div class="pc-btn expand confirm filled" id="publish"><span class="glyphicon glyphicon-ok-sign"></span> &nbsp;&nbsp;&nbsp;Save & Exit</div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="row">' +
                    '<div class="col-xs-12">' +
                        '<div class="container-canvas" id="clone-canvas-wrapper">' +
                            '<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                            //'<canvas id="main-canvas" width="1300" height="750">This is the canvas</canvas>' +
                            '<img id="ui-overlay" src="/static/omfiles/images/ui-overlay.png" />' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</section>'),

    removeMenuViews: function() {
        this.getViewsLength();
        _.each(this.menuViews, function(menuView) {
            dbgconsolelog("Destroying menu view: " + menuView);
            dbgconsolelog("Secondary views: ");
            dbgconsolelog(menuView.secondaryviews);
            if (menuView.secondaryviews && menuView.secondaryviews.length > 0) {
                dbgconsolelog("Menu view has secondary views to remove");
                menuView.removeSecondaryViews();
            } else {
                dbgconsolelog("Menu view has no secondary views");
            }
            menuView.$el.empty();
            menuView.remove();
            menuView.unbind();
            menuView.undelegateEvents();
            this.menuViews = _.without(this.menuViews, menuView);
        });
        $('#secondarypopups').empty();
    },

    getViewsLength: function() {
        dbgconsolelog("There are " + this.menuViews.length + " menu views.");
        _.each(this.menuViews, function(menu) {
            dbgconsolelog("This menuview has " + menu.secondaryviews.length + " secondary views");
        });
    },

    initialize: function() {
        $(document).ready(function() {
            $(window).off('resize.chartresize');
        });

        this.$el.empty();
        shapecollection.destroyAll();
        shapecollection.reset();
        arrowcollection.destroyAll();
        //arrowcollection.reset();
        this.menuViews = [];
        this.listenTo(shapecollection, 'add', this.addShapeMenu);
        this.listenTo(arrowcollection, 'add', this.addArrowMenu);
        this.render();
    },

    render: function() {
        var that = this;
        dbgconsolelog("Chart render called!");
        //console.trace();
        this.$el.html(this.template({
            shape1url: '../../static/omfiles/images/shape-1.png',
            shape2url: '../../static/omfiles/images/shape-2.png',
            shape3url: '../../static/omfiles/images/shape-3.png',
            arrowurl: '../../static/omfiles/images/arrow-img.png',
            texticonurl: '../../static/omfiles/images/text-icon.png',
            charttitle: 'Click to Enter Chart Title',
            charttags: this.model.get('tags')
        }));
        newCanvasInit();

        $.when(canvas.loadFromJSON(this.model.get('chartobj'), canvas.renderAll.bind(canvas), function(o, object) {
            if (object.type === 'pcarrow') {
                dbgconsolelog("Arrow " + JSON.stringify(o) + " became object " + JSON.stringify(object.toJSON()));
            }
        })).done(function() {
            dbgconsolelog("All done! Ready to create menus");
            canvas.forEachObject(function(o) {
                if (isGroupContainingNonSidebarShape(o)) {
                    var innerShape = getShapeFromGroup(o);

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isNonSidebarShape(o)) {
                    var innerShape = o;

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isArrow(o)) {
                    arrowcollection.create({
                        id: o.arrowId
                    });
                }
                if ($('#dropdown-1').length != 0) {
                    dbgconsolelog("Dropdown 1 seen!");
                } else {
                    dbgconsolelog("Dropdown 1 not seen!")
                };
            });
        });
        addCanvasUI();
        //this.trigger('renderEvent');
        dispatcher.trigger('renderEvent');
    }

});

App.ChartBareView = App.MyCanvasView.extend({
    /*template: _.template('\
<div><h1><%= title%><button id="editchart" href="/chart/<%= slug%>/edit" type="button" class="btn btn-primary" style="margin-left: 15px">Edit</button></h1></div>\
<img src="https://s3.amazonaws.com/propchan-sandbox-img/<%=imgurl%>" alt=<%=title%>>'),
    initialize: function() {
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            title: this.model.get('title'),
            slug: this.model.get('slug'),
            imgurl: this.model.get('imgurl')
        }));
        chartTitle = this.model.get('title');
    },*/

    events: {
        'click #talkpage': 'showTalkPage',
        'click #clonechart': 'cloneChart',
        'click #favoritechart.add': 'favoriteChart',
        'click #favoritechart.remove': 'unfavoriteChart'
        //'click #zoominbutton': 'zoomIn',
        //'click #zoomoutbutton': 'zoomOut'
    },

    initialize: function(options) {
        /*this.on('renderEvent', function() {
            alert("Rendered");
            //dbgconsolelog("Render event called");
            //canvas.renderAll();
        });*/

        this.needsrerender = options.needsrerender;

        // TODO RCR: FIND BEST WAY TO REMOVE THIS WHEN NOT IN THIS VIEW
        $(document).ready(function() {
            $(window).on('resize.chartresize', function() {
                //if ($(window).width() <= 480) {

                //}
                updateCanvasSize($("#main-canvas").parents(".work-section").width(), $("#main-canvas").parents(".work-section").height());

            });
        });

        this.voteMenu = new App.VoteMenuView({model: this.model});

        dbgconsolelog("Talk view is: " + this.talkView);

        var initfn;

        if(this.needsrerender) {
            initfn = (function() {
                this.$el.empty();
                shapecollection.destroyAll();
                shapecollection.reset();
                arrowcollection.destroyAll();
                arrowcollection.reset();
                this.menuViews = [];
                this.listenTo(shapecollection, 'add', this.addShapeMenu);
                this.listenTo(arrowcollection, 'add', this.addArrowMenu);
                this.render();
            }).bind(this);
        } else {
            initfn = (function() {
                shapecollection.destroyAll();
                shapecollection.reset();
                arrowcollection.destroyAll();
                arrowcollection.reset();
                this.menuViews = [];
                this.listenTo(shapecollection, 'add', this.addShapeMenu);
                this.listenTo(arrowcollection, 'add', this.addArrowMenu);
                this.render();
            }).bind(this);
        }

        defer = $.Deferred(initfn);
        defer.resolve();
        defer.done(function(){
            dbgconsolelog("Deferred resolved!");
            canvas.renderAll();
        })

    },

    favoriteButton: '<a class="chart-action yellow add" href="#" id="favoritechart" data-toggle="tooltip" data-container="body" data-placement="top" title="Add Favorite"><span class="fa fa-star"></span><span class="chart-action-name">Add Favorite</span></a>',

    unfavoriteButton: '<a class="chart-action yellow remove" href="#" id="favoritechart" data-toggle="tooltip" data-container="body" data-placement="top" title="Remove Favorite"><span class="fa fa-star-o"></span><span class="chart-action-name">Remove Favorite</span></a>',

    render: function() {
        var self = this;

        if(self.needsrerender) {
            dbgconsolelog("Rerender template");

            this.$el.html(this.template({
                shape1url: '../../static/omfiles/images/shape-1.png',
                shape2url: '../../static/omfiles/images/shape-2.png',
                shape3url: '../../static/omfiles/images/shape-3.png',
                arrowurl: '../../static/omfiles/images/arrow-img.png',
                texticonurl: '../../static/omfiles/images/text-icon.png',
                charttitle: this.model.get('title'),
                chartauthor: this.model.get('created_by_name'),
                chartslug: this.model.get('slug'),
                posvotes: this.model.get('positive_votes'),
                negvotes: this.model.get('negative_votes'),
                imgurl: this.model.get('imgurl'),
                showShare: !e_v.ip,
                tagLinkFormatter: prettyURLTag
                /*startimgarr: startsrcarr,
                stepimgarr: stepsrcarr,
                decimgarr: decisionsrcarr,
                selstart: getParameterByName('start'),
                selstarthl: getParameterByName('starthl'),
                selstep: getParameterByName('step'),
                selstephl: getParameterByName('stephl'),
                seldec: getParameterByName('dec'),
                seldechl: getParameterByName('dechl'),
                seltcolor: getParameterByName('tcolor'),
                selthlcolor: getParameterByName('thlcolor')*/
            }));

            var authorProfile = new App.UserProfile({user_id: self.model.get('created_by_name')});
            authorProfile.fetch().done(function() {
                var authorView = new App.UserProfileShortView({
                    model: authorProfile,
                    extraClasses: 'col-xs-8 col-xs-offset-2 col-sm-offset-0 col-sm-4'
                });

                $('#chart-footer').append(authorView.render().el);
            });

            currentUser.fetch().done(function() {
                var userInfo = new App.UserProfile({user_id: currentUser.get('username')});
                userInfo.fetch().done(function() {
                    /*if ($.inArray(self.model.get('slug'), userInfo.get('favorites')) > -1)
                        $('#favoritechart').removeClass('disabled add').addClass('remove').attr('title', 'Remove Favorite').html(self.unfavoriteButton);
                    else
                        $('#favoritechart').removeClass('disabled remove').addClass('add').attr('title', 'Add Favorite').html(self.favoriteButton);*/
                    $('.chart-action').tooltip('destroy');

                    if ($.inArray(self.model.get('slug'), userInfo.get('favorites')) > -1)
                        $('#chart-actions-wrapper').find('#favoritechart, #favoritechart-placeholder').replaceWith(self.unfavoriteButton);
                    else
                        $('#chart-actions-wrapper').find('#favoritechart, #favoritechart-placeholder').replaceWith(self.favoriteButton);

                    $('.chart-action').tooltip();
                });
            });
        }

        $('.chart-action, .tag-edit').tooltip();

        this.voteMenu.setElement(this.$el.find('.did-it-work')).render();

        chartTitle = this.model.get('title');

        //newCanvasInit();
        canvas = new fabric.Canvas('main-canvas');
        /*canvas.setWidth($("#main-canvas").parents(".work-section").width());
        canvas.setHeight($("#main-canvas").parents(".work-section").height());
        canvas.calcOffset();*/
        updateCanvasSize($("#main-canvas").parents(".work-section").width(), $("#main-canvas").parents(".work-section").height());
        canvas.targetFindTolerance = 5;
        canvas.selection = false;
        canvas._currentSelection = null;
        viewCanvasInit();

        /*$("#main-canvas").click(function(e) {
            alert(e.which);
        });*/

        var chartobjToLoad = (typeof window.pcchartobj !== 'undefined' && window.pcchartobj) ? window.pcchartobj : this.model.get('chartobj');
        dbgconsolelog(chartobjToLoad);
        $.when(canvas.loadFromJSON(chartobjToLoad, function() {
            removeSidebarElements();
            canvas.renderAll.bind(canvas);
            canvasNav = new FabricCanvasNavigation(canvas, '#canvas-navigation-header', '#canvas-navigation-wrapper').init();
        }, function(o, object) {
            if (object.type === 'pcarrow') {
                dbgconsolelog("Arrow " + JSON.stringify(o) + " became object " + JSON.stringify(object.toJSON()));
            }
        })).done(function() {
            canvas.calcOffset();
            resetObjectCoords();
            dbgconsolelog("All done! Ready to create menus");
            canvas.forEachObject(function(o) {
                o.set({
                    lockMovementX: 'true',
                    lockMovementY: 'true'
                })
                //o.selectable = false;
                o.hasControls = o.hasBorders = false;
                if (isGroupContainingNonSidebarShape(o)) {
                    var innerShape = getShapeFromGroup(o);

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isNonSidebarShape(o)) {
                    var innerShape = o;

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isArrow(o)) {
                    arrowcollection.create({
                        id: o.arrowId
                    });
                }
            });
            window.setTimeout(setAllObjCoords,500);
        });
        addCanvasUI();
        this.setMetaTags();
        //this.trigger('renderEvent');
        dispatcher.trigger('renderEvent');
    },

    setMetaTags: function() {
        if($("meta[property='og:image']").length < 1) {
            $('head').append("<meta property='og:image' content='http://s3.amazonaws.com/properchannel-img/"+this.model.get('imgurl')+"' />");
        } else {
            $("meta[property='og:image']").attr("content", "http://s3.amazonaws.com/properchannel-img/"+this.model.get('imgurl'));
        }
    },

    showTalkPage: function(e) {
        e.preventDefault();

        if (!this.talkView) {
            this.talkView = new App.TalkPageView({
                el: $('#extras-sidebar'),
                model: this.model
            });
        }

        this.talkView.open();
    },

    removeTalkView: function() {
        this.talkView.$el.empty();
        this.talkView.stopListening();
        this.talkView.unbind();
        this.talkView.undelegateEvents();
    },

    favoriteChart: function(e) {
        e.preventDefault();

        var self = this;

        currentUser.fetch({
            success: function() {
                if(currentUser.get('email') === "none") {
                    Messenger().post({
                        message: "Please login or register to follow users!",
                        type: "error",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                }
                else {
                    $.ajax({
                        method: 'POST',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: '/api/user/'+currentUser.get('username')+'/favorites/add',
                        data: { chartslug: self.model.get('slug') },
                        success: function(response) {
                            dbgconsolelog(response);
                            Messenger().post({
                                message: '\"'+self.model.get('title')+'\" has been added to your Favorites!',
                                type: "success",
                                showCloseButton: true,
                                hideAfter: 5,
                                hideOnNavigate: true
                            });
                            /*$('#favoritechart').removeClass('disabled add').addClass('remove').html(self.unfavoriteButton);*/

                            $('.chart-action').tooltip('destroy');

                            $('#chart-actions-wrapper').find('#favoritechart, #favoritechart-placeholder').replaceWith(self.unfavoriteButton);

                            $('.chart-action').tooltip();
                        },
                        fail: function(response) {
                            dbgconsolelog(response);
                        }
                    })
                }
            }
        })
    },

    unfavoriteChart: function(e) {
        e.preventDefault();

        var self = this;

        currentUser.fetch({
            success: function() {
                if(currentUser.get('email') === "none") {
                    Messenger().post({
                        message: "Please login or register to follow users!",
                        type: "error",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                }
                else {
                    $.ajax({
                        method: 'POST',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: '/api/user/'+currentUser.get('username')+'/favorites/remove',
                        data: { chartslug: self.model.get('slug') },
                        success: function(response) {
                            dbgconsolelog(response);
                            Messenger().post({
                                message: '\"'+self.model.get('title')+'\" has been removed from your Favorites!',
                                type: "success",
                                showCloseButton: true,
                                hideAfter: 5,
                                hideOnNavigate: true
                            });
                            /*$('#favoritechart').removeClass('disabled remove').addClass('add').html(self.favoriteButton);*/

                            $('.chart-action').tooltip('destroy');

                            $('#chart-actions-wrapper').find('#favoritechart, #favoritechart-placeholder').replaceWith(self.favoriteButton);

                            $('.chart-action').tooltip();
                        },
                        fail: function(response) {
                            dbgconsolelog(response);
                        }
                    })
                }
            }
        })
    },

    /*zoomIn: function() {
        dbgconsolelog("Zooming in");
        if(zoomLevel > 3.5) {
            dbgconsolelog("Already at max zoom");
            return false;
        }
        zoomLevel = zoomLevel * 1.5;
        updateCanvasSize(Math.round(tWidth * zoomLevel * cScaleX), Math.round(tHeight * zoomLevel * cScaleY));
        var obj = canvas.getObjects();
        var arrows = [];
        for (var i in obj) {
            dbgconsolelog("Scaling: ")
            dbgconsolelog(obj[i]);
            var scaleX = obj[i].get('scaleX');
            dbgconsolelog("Old ScaleX is: "+scaleX);
            var scaleY = obj[i].get('scaleY');
            dbgconsolelog("Old ScaleY is: "+scaleY);
            var left = obj[i].get('left');
            dbgconsolelog("Old left is: "+left);
            var top = obj[i].get('top');
            dbgconsolelog("Old top is: "+top);
            //var width = obj[i].get('width');
            //var height = obj[i].get('height');

            var tempScaleX = scaleX * 1.5;
            var tempScaleY = scaleY * 1.5;
            var tempLeft = left * 1.5;
            var tempTop = top * 1.5;
            //var tempWidth = width * 1.5;
            //var tempHeight = height * 1.5;
            if(obj[i] instanceof fabric.Pcarrow) {
                //dbgconsolelog("Old points: ["+obj[i].get('x1')+","+obj[i].get('y1')+","+obj[i].get('x2')+","+obj[i].get('y2')+"]");
                arrows.push(obj[i]);
            }

            obj[i].set('scaleX', tempScaleX);
            dbgconsolelog("New ScaleX is: "+obj[i].get('scaleX'));
            obj[i].set('scaleY', tempScaleY);
            dbgconsolelog("New ScaleY is: "+obj[i].get('scaleY'));
            obj[i].set('left', tempLeft);
            dbgconsolelog("New left is: "+obj[i].get('left'));
            obj[i].set('top', tempTop);
            dbgconsolelog("New top is: "+obj[i].get('top'));
            //obj[i].set('width', tempWidth);
            //obj[i].set('height', tempHeight);
            if(obj[i] instanceof fabric.Pcarrow) {
                var thearrow = obj[i],
                    startShape = getShapeByID(thearrow.fromShape),
                    endShape = getShapeByID(thearrow.toShape),
                    startCtr = startShape.getCenterPoint();
                    endCtr = endShape.getCenterPoint();
                thearrow.set('x1', startCtr.x);
                thearrow.set('y1', startCtr.y);
                thearrow.set('x2', endCtr.x);
                thearrow.set('y2', endCtr.y);

                dbgconsolelog("New points: ["+obj[i].get('x1')+","+obj[i].get('y1')+","+obj[i].get('x2')+","+obj[i].get('y2')+"]");
            }
            canvas.fire('object:scaling', {target: obj[i]});
            obj[i].setCoords();
        }
        canvas.renderAll();
    },
    zoomOut: function() {
        dbgconsolelog("Zooming out");
        if(zoomLevel < 0.3) {
            dbgconsolelog("Already at min zoom");
            return false;
        }
        zoomLevel = zoomLevel / 1.5;
        updateCanvasSize(Math.round(tWidth * zoomLevel * cScaleX), Math.round(tHeight * zoomLevel * cScaleY));
        var obj = canvas.getObjects();
        for (var i in obj) {
            dbgconsolelog("Scaling: ")
            dbgconsolelog(obj[i]);
            var scaleX = obj[i].get('scaleX');
            dbgconsolelog("Old ScaleX is: "+scaleX);
            var scaleY = obj[i].get('scaleY');
            dbgconsolelog("Old ScaleY is: "+scaleY);
            var left = obj[i].get('left');
            dbgconsolelog("Old left is: "+left);
            var top = obj[i].get('top');
            dbgconsolelog("Old top is: "+top);

            var tempScaleX = scaleX / 1.5;
            var tempScaleY = scaleY / 1.5;
            var tempLeft = left / 1.5;
            var tempTop = top / 1.5;

            obj[i].set('scaleX', tempScaleX);
            dbgconsolelog("New ScaleX is: "+obj[i].get('scaleX'));
            obj[i].set('scaleY', tempScaleY);
            dbgconsolelog("New ScaleY is: "+obj[i].get('scaleY'));
            obj[i].set('left', tempLeft);
            dbgconsolelog("New left is: "+obj[i].get('left'));
            obj[i].set('top', tempTop);
            dbgconsolelog("New top is: "+obj[i].get('top'));
            if(obj[i] instanceof fabric.Pcarrow) {
                var thearrow = obj[i],
                    startShape = getShapeByID(thearrow.fromShape),
                    endShape = getShapeByID(thearrow.toShape),
                    startCtr = startShape.getCenterPoint();
                    endCtr = endShape.getCenterPoint();
                thearrow.set('x1', startCtr.x);
                thearrow.set('y1', startCtr.y);
                thearrow.set('x2', endCtr.x);
                thearrow.set('y2', endCtr.y);

                dbgconsolelog("New points: ["+obj[i].get('x1')+","+obj[i].get('y1')+","+obj[i].get('x2')+","+obj[i].get('y2')+"]");
            }
            obj[i].setCoords();
        }
        canvas.renderAll();
    },*/

    template: _.template('' +
        '<section class="middle-panel loged-in-user clearfix">' +
            '<div class="chart-container container">' +
                '<div class="row">' +
                    '<div class="col-xs-12 text-center" id="chart-header"><h3 id="chartTitle" ><%= charttitle %></h3></div>' +
                    /*'<div class="col-xs-2 hidden-lg">' +
                        '<button type="button" class="collapsed" data-toggle="collapse" data-target="#chart-submenu">' +
                            '<span class="sr-only">Toggle navigation</span>' +
                            '<span class="icon-bar"></span>' +
                            '<span class="icon-bar"></span>' +
                            '<span class="icon-bar"></span>' +
                        '</button>' +
                    '</div>' +*/
                    //'<div class="col-xs-12"></div>' +
                    '<div class="col-xs-12"><div id="chart-submenu-wrapper"><div class="collapse" id="chart-submenu"><div class="row">' +
                        '<div class="chart-submenu-section col-xs-12 col-lg-4 col-lg-push-4 did-it-work vertical-align-wrapper" id="did-it-work">'+ //hidden-xs hidden-sm hidden-md col-lg-4
                            //'<h5 class="bottom-txt"><span class="green"><%= posvotes %></span> / <span class="red"><%= negvotes %></span></h5>'+
                        '</div>'+
                        '<div class="chart-submenu-section col-xs-12 col-lg-4 col-lg-pull-4 text-left">' + //hidden-xs hidden-sm hidden-md col-lg-4
                            //'<div class="left-box">' +
                                //'<input name="" value="" class="width-m" placeholder="Enter Chart Title Here" type="text">'+

                                //'<div class="row">'+
                                //'<div class="col-md-12">'+
                                //'<div class="row">'+
                                    //'<div class="col-md-12">'+
                                        '<% if (showShare) { %><div class="addthis_toolbox addthis_default_style addthis_32x32_style">'+
                                            '<a class="addthis_button_facebook"><span class="fa fa-facebook"></span></a>'+
                                            '<a class="addthis_button_twitter"><span class="fa fa-twitter"></span></a>'+
                                            '<a class="addthis_button_google_plusone_share"><span class="fa fa-google-plus"></span></a>'+
                                            '<a class="addthis_button_linkedin"><span class="fa fa-linkedin"></span></a>'+
                                            '<a class="addthis_button_pinterest_share"><span class="fa fa-pinterest-p"></span></a>'+
                                            '<a class="addthis_button_reddit"><span class="fa fa-reddit"></span></a>'+
                                            '<a class="addthis_button_compact"><span class="fa fa-plus"></span></a>'+
                                            //'<a class="addthis_button_twitter"></a>'+
                                            //'<a class="addthis_button_google_plusone_share"></a>'+
                                            //'<a class="addthis_button_pinterest_share"></a>'+
                                        '</div><% } %>'+
                                    //'</div>'+
                                //'</div>' +
                            //'</div>' +
                        '</div>' +
                        '<div class="chart-submenu-section col-xs-12 col-lg-4 text-right">' + //hidden-xs hidden-sm hidden-md col-lg-4
                            '<div id="chart-actions-wrapper">' +
                                //'<div id="atstbx" class="at-share-tbx-element addthis_32x32_style addthis-smartlayers animated at4-show"><a class="at-share-btn at-svc-facebook"><span class="at300bs at15nc at15t_facebook" title="Facebook"></span></a><a class="at-share-btn at-svc-twitter"><span class="at300bs at15nc at15t_twitter" title="Twitter"></span></a><a class="at-share-btn at-svc-google_plusone_share"><span class="at300bs at15nc at15t_google_plusone_share" title="Google+"></span></a><a class="at-share-btn at-svc-pinterest_share"><span class="at300bs at15nc at15t_pinterest_share" title="Pinterest"></span></a></div></div>'+
                                '<a class="chart-action blue" href="/chart/<%= chartslug %>/edit" id="editchart" data-toggle="tooltip" data-container="body" data-placement="top" title="Edit Chart"><span class="fa fa-pencil"></span><span class="chart-action-name">Edit</span></a> ' +
                                '<a class="chart-action green" href="/clone/<%= chartslug %>" id="clonechart" data-toggle="tooltip" data-container="body" data-placement="top" title="Clone Chart"><span class="fa fa-files-o"></span><span class="chart-action-name">Clone</span></a> ' +
                                '<a class="chart-action purple" href="#" id="talkpage" data-toggle="tooltip" data-container="body" data-placement="top" title="Discuss"><span class="fa fa-comments"></span><span class="chart-action-name">Discuss</span></a>' +
                                '<a class="chart-action disabled yellow" href="#" id="favoritechart-placeholder" data-toggle="tooltip" data-container="body" data-placement="top" title="Checking Favorite..."><span class="fa fa-star-o"></span><span class="chart-action-name">Add Favorite</span></a>' +
                            '</div>' +
                        '</div>' +
                    '</div></div></div></div>' +
                    '<div id="chart-submenu-dropdown" class="col-xs-12 hidden-lg collapsed text-center" data-toggle="collapse" data-target="#chart-submenu"><span class="caret large"></span></div>' +
                '</div>' +
                '<div class="row user-top-row offcanvas-wrapper offcanvas-wrapper-right">' +
                    '<div id="toast-wrapper">' +
                        '<div id="toast-container"></div>' +
                    '</div>' +
                    '<div class="col-lg-12 col-md-8 col-xs-12">' +
                        '<div class="row">' +
                            '<div class="work-space">' +
                                '<div class="col-lg-12">' +
                                    '<div class="work-section">' +
                                        '<div class="container-canvas" id="view-canvas-wrapper">' +
                                            '<canvas id="main-canvas">This is the canvas</canvas>' + // width="1300" height="750"
                                        '</div>' +
                                        '<div class="secondarypopups" id="secondarypopups"></div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="hidden-lg col-xs-12"><h4 class="text-center" id="canvas-navigation-header"></h4></div>' +
                                '<div class="hidden-lg col-xs-12">' +
                                    '<div class="row" id="canvas-navigation-wrapper">' +
                                        /*'<div class="col-xs-4" id="nav-prev-button">' +
                                            '<p>Previous</p>' +
                                        '</div>' +
                                        '<div class="col-xs-2" id="nav-yes-button">' +
                                            '<p>Yes</p>' +
                                        '</div>' +
                                        '<div class="col-xs-2" id="nav-no-button">' +
                                            '<p>No</p>' +
                                        '</div>' +
                                        '<div class="col-xs-4" id="nav-next-button">' +
                                            '<p>Next</p>' +
                                        '</div>' +*/
                                    '</div>' +
                                '</div>' +
                                '<img class="hidden-image" src="http://s3.amazonaws.com/properchannel-img/<%= imgurl %>">'+
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-lg-5 col-md-4 col-xs-10 offcanvas-sidebar"><div id="extras-sidebar" class="sidebar-content">' +
                        '<div class="panel-header">' +
                            '<span class="panel-title">More Info</span>' +
                        '</div>' +
                        '<div class="panel-content"><h4 class="text-center">* Click a shape in the chart for more information</h4></div>' +
                    '</div></div>' +
                '</div>' +
                '<div id="chart-footer" class="row">'+
                    '<div class="col-xs-12 col-sm-8 tagshowbox">'+
                        '<% _.each(this.model.get("tags"), function(i) { %>  <a class="chart-tag" href="/search/tags/<%= tagLinkFormatter(i) %>"><%= i %></a> <% }); %>'+
                        '<a class="tag-edit" href="/chart/<%= chartslug %>/edit" data-toggle="tooltip" data-container="body" data-placement="right" title="Edit Tags"><span class="fa fa-pencil"></span></a>' +
                    '</div>'+
                    /*'<div class="col-xs-6 col-sm-4">' +
                        '<div id="author-footer" class="text-center">' +
                            '<div class="author-wrapper">' +
                                '<div class="profile-pic"></div>' +
                                '<a href="/profile/<%= chartauthor %>"><%= chartauthor %></a>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +*/
                '</div>'+
            '</div>' +
        '</section>')
})

App.ChartVersionView = App.MyCanvasView.extend({
    /*template: _.template('\
<div><h1><%= title%><button id="editchart" href="/chart/<%= slug%>/edit" type="button" class="btn btn-primary" style="margin-left: 15px">Edit</button></h1></div>\
<img src="https://s3.amazonaws.com/propchan-sandbox-img/<%=imgurl%>" alt=<%=title%>>'),
    initialize: function() {
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            title: this.model.get('title'),
            slug: this.model.get('slug'),
            imgurl: this.model.get('imgurl')
        }));
        chartTitle = this.model.get('title');
    },*/

    events: {
        'click #makecurrent': 'makeCurrent'
        //'click #zoominbutton': 'zoomIn',
        //'click #zoomoutbutton': 'zoomOut'
    },

    initialize: function() {
        /*this.on('renderEvent', function() {
            alert("Rendered");
            //dbgconsolelog("Render event called");
            //canvas.renderAll();
        });*/

        // TODO RCR: FIND BEST WAY TO REMOVE THIS WHEN NOT IN THIS VIEW
        $(document).ready(function() {
            $(window).on('resize.chartresize', function() {
                //if ($(window).width() <= 480) {

                //}
                updateCanvasSize($("#main-canvas").parents(".work-section").width(), $("#main-canvas").parents(".work-section").height());

            });
        });

        this.voteMenu = new App.VoteMenuView({model: this.model});

        dbgconsolelog("Talk view is: " + this.talkView);

        var initfn = (function() {
            this.$el.empty();
            shapecollection.destroyAll();
            shapecollection.reset();
            arrowcollection.destroyAll();
            arrowcollection.reset();
            this.menuViews = [];
            this.listenTo(shapecollection, 'add', this.addShapeMenu);
            this.listenTo(arrowcollection, 'add', this.addArrowMenu);
            this.render();
        }).bind(this);

        defer = $.Deferred(initfn);
        defer.resolve();
        defer.done(function(){
            dbgconsolelog("Deferred resolved!");
            canvas.renderAll();
        })

        this.addRevisions();

    },

    render: function() {
        dbgconsolelog("Chart render called!");
        this.$el.html(this.template({
            shape1url: '../../static/omfiles/images/shape-1.png',
            shape2url: '../../static/omfiles/images/shape-2.png',
            shape3url: '../../static/omfiles/images/shape-3.png',
            arrowurl: '../../static/omfiles/images/arrow-img.png',
            texticonurl: '../../static/omfiles/images/text-icon.png',
            charttitle: this.model.get('title'),
            chartslug: this.model.get('slug'),
            posvotes: this.model.get('positive_votes'),
            negvotes: this.model.get('negative_votes'),
            imgurl: this.model.get('imgurl'),
            versionnumber: this.model.get('version'),
            tagLinkFormatter: prettyURLTag
        }));

        this.voteMenu.setElement(this.$el.find('.did-it-work')).render();

        chartTitle = this.model.get('title');

        //newCanvasInit();
        canvas = new fabric.Canvas('main-canvas');
        /*canvas.setWidth($("#main-canvas").parents(".work-section").width());
        canvas.setHeight($("#main-canvas").parents(".work-section").height());
        canvas.calcOffset();*/
        updateCanvasSize($("#main-canvas").parents(".work-section").width(), $("#main-canvas").parents(".work-section").height());
        canvas.targetFindTolerance = 5;
        canvas.selection = false;
        canvas._currentSelection = null;
        viewCanvasInit();

        /*$("#main-canvas").click(function(e) {
            alert(e.which);
        });*/

        dbgconsolelog(this.model.get('chartobj'));
        $.when(canvas.loadFromJSON(this.model.get('chartobj'), function() {
            removeSidebarElements();
            canvas.renderAll.bind(canvas);
            canvasNav = new FabricCanvasNavigation(canvas, '#canvas-navigation-header', '#canvas-navigation-wrapper').init();
        }, function(o, object) {
            if (object.type === 'pcarrow') {
                dbgconsolelog("Arrow " + JSON.stringify(o) + " became object " + JSON.stringify(object.toJSON()));
            }
        })).done(function() {
            canvas.calcOffset();
            resetObjectCoords();
            dbgconsolelog("All done! Ready to create menus");
            canvas.forEachObject(function(o) {
                o.set({
                    lockMovementX: 'true',
                    lockMovementY: 'true'
                })
                o.selectable = false;
                if (isGroupContainingNonSidebarShape(o)) {
                    var innerShape = getShapeFromGroup(o);

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isNonSidebarShape(o)) {
                    var innerShape = o;

                    shapecollection.create({
                        id: innerShape.shapeId,
                        typename: innerShape.get('type')
                    });
                } else if (isArrow(o)) {
                    arrowcollection.create({
                        id: o.arrowId
                    });
                }
            });
            window.setTimeout(setAllObjCoords,500);
        });
        addCanvasUI();
        this.setMetaTags();
        //this.trigger('renderEvent');
        dispatcher.trigger('renderEvent');
    },

    setMetaTags: function() {
        if($("meta[property='og:image']").length < 1) {
            $('head').append("<meta property='og:image' content='http://s3.amazonaws.com/properchannel-img/"+this.model.get('imgurl')+"' />");
        } else {
            $("meta[property='og:image']").attr("content", "http://s3.amazonaws.com/properchannel-img/"+this.model.get('imgurl'));
        }
    },

    showTalkPage: function(e) {
        e.preventDefault();

        if (!this.talkView) {
            this.talkView = new App.TalkPageView({
                el: $('#extras-sidebar'),
                model: this.model
            });
        }

        this.talkView.open();
    },

    removeTalkView: function() {
        this.talkView.$el.empty();
        this.talkView.stopListening();
        this.talkView.unbind();
        this.talkView.undelegateEvents();
    },

    addRevisions: function() {
        this.revisionsView = new App.RevisionsView({model: this.model});
        $('.chart-container').append(this.revisionsView.render().el);
        //console.log("Appended revisions");
    },

    removeRevisionsView: function() {
        this.revisionsView.$el.empty();
        this.revisionsView.stopListening();
        this.revisionsView.unbind();
        this.revisionsView.undelegateEvents();
    },

    makeCurrent: function(e) {
        var thisversionnumber = this.model.get('version')
        //console.log("Making version "+thisversionnumber+" current");

        var thisslug = this.model.get('slug');
        e.preventDefault();

        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "POST",
            url: '/api/chart/' + this.model.get('slug')+'/restore',
            data: {
                versionnumber: thisversionnumber
            },

            success: function(resp) {
                dbgconsolelog(resp);
                dbgconsolelog("Restored version "+thisversionnumber+" of chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                router.navigate('/chart/'+thisslug, {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });

        //dbgconsolelog("Saving edits to chart with title " + chartTitle + "!");
        /*



        var includeProps = 'hasControls hasBorders inSidebar lockMovementX lockMovementY perPixelTargetFind'.split(' ');
        sendTitle = $('#inputTitle').val();
        canvas.deactivateAll().fire('selection:cleared').renderAll();
        var sidebarObjects = _.where(canvas.getObjects(), {inSidebar: true});
        removeObjectsFromCanvas(sidebarObjects);
        sendObj = JSON.stringify(canvas.toJSON(includeProps));
        //sendObj = JSON.stringify(canvas.toObject());
        sendDataURL = canvas.renderAll().toDataURL("image/png");
        addObjectsToCanvas(sidebarObjects);
        canvas.renderAll();
        sendTags = JSON.stringify(_.extend({}, $("input[data-role=tagsinput]").tagsinput('items')));
        Messenger().run({
          successMessage: 'Chart saved!',
          errorMessage: 'Error saving chart',
          progressMessage: 'Saving chart...',
          hideAfter: 5,
          hideOnNavigate: true
        }, {
            type: "PUT",
            url: '/api/chart/' + this.model.get('slug'),
            data: {
                title: sendTitle,
                chartobj: sendObj,
                imgupload: sendDataURL,
                tags: sendTags
            },

            success: function(resp) {
                dbgconsolelog(resp);
                dbgconsolelog("Created chart with title: "+resp.chart.title+" and slug: "+resp.chart.slug);
                router.navigate('/chart/'+thisslug, {trigger: true});
                return '\"'+resp.chart.title+'\" saved!';
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
*/
    },

    /*zoomIn: function() {
        dbgconsolelog("Zooming in");
        if(zoomLevel > 3.5) {
            dbgconsolelog("Already at max zoom");
            return false;
        }
        zoomLevel = zoomLevel * 1.5;
        updateCanvasSize(Math.round(tWidth * zoomLevel * cScaleX), Math.round(tHeight * zoomLevel * cScaleY));
        var obj = canvas.getObjects();
        var arrows = [];
        for (var i in obj) {
            dbgconsolelog("Scaling: ")
            dbgconsolelog(obj[i]);
            var scaleX = obj[i].get('scaleX');
            dbgconsolelog("Old ScaleX is: "+scaleX);
            var scaleY = obj[i].get('scaleY');
            dbgconsolelog("Old ScaleY is: "+scaleY);
            var left = obj[i].get('left');
            dbgconsolelog("Old left is: "+left);
            var top = obj[i].get('top');
            dbgconsolelog("Old top is: "+top);
            //var width = obj[i].get('width');
            //var height = obj[i].get('height');

            var tempScaleX = scaleX * 1.5;
            var tempScaleY = scaleY * 1.5;
            var tempLeft = left * 1.5;
            var tempTop = top * 1.5;
            //var tempWidth = width * 1.5;
            //var tempHeight = height * 1.5;
            if(obj[i] instanceof fabric.Pcarrow) {
                //dbgconsolelog("Old points: ["+obj[i].get('x1')+","+obj[i].get('y1')+","+obj[i].get('x2')+","+obj[i].get('y2')+"]");
                arrows.push(obj[i]);
            }

            obj[i].set('scaleX', tempScaleX);
            dbgconsolelog("New ScaleX is: "+obj[i].get('scaleX'));
            obj[i].set('scaleY', tempScaleY);
            dbgconsolelog("New ScaleY is: "+obj[i].get('scaleY'));
            obj[i].set('left', tempLeft);
            dbgconsolelog("New left is: "+obj[i].get('left'));
            obj[i].set('top', tempTop);
            dbgconsolelog("New top is: "+obj[i].get('top'));
            //obj[i].set('width', tempWidth);
            //obj[i].set('height', tempHeight);
            if(obj[i] instanceof fabric.Pcarrow) {
                var thearrow = obj[i],
                    startShape = getShapeByID(thearrow.fromShape),
                    endShape = getShapeByID(thearrow.toShape),
                    startCtr = startShape.getCenterPoint();
                    endCtr = endShape.getCenterPoint();
                thearrow.set('x1', startCtr.x);
                thearrow.set('y1', startCtr.y);
                thearrow.set('x2', endCtr.x);
                thearrow.set('y2', endCtr.y);

                dbgconsolelog("New points: ["+obj[i].get('x1')+","+obj[i].get('y1')+","+obj[i].get('x2')+","+obj[i].get('y2')+"]");
            }
            canvas.fire('object:scaling', {target: obj[i]});
            obj[i].setCoords();
        }
        canvas.renderAll();
    },
    zoomOut: function() {
        dbgconsolelog("Zooming out");
        if(zoomLevel < 0.3) {
            dbgconsolelog("Already at min zoom");
            return false;
        }
        zoomLevel = zoomLevel / 1.5;
        updateCanvasSize(Math.round(tWidth * zoomLevel * cScaleX), Math.round(tHeight * zoomLevel * cScaleY));
        var obj = canvas.getObjects();
        for (var i in obj) {
            dbgconsolelog("Scaling: ")
            dbgconsolelog(obj[i]);
            var scaleX = obj[i].get('scaleX');
            dbgconsolelog("Old ScaleX is: "+scaleX);
            var scaleY = obj[i].get('scaleY');
            dbgconsolelog("Old ScaleY is: "+scaleY);
            var left = obj[i].get('left');
            dbgconsolelog("Old left is: "+left);
            var top = obj[i].get('top');
            dbgconsolelog("Old top is: "+top);

            var tempScaleX = scaleX / 1.5;
            var tempScaleY = scaleY / 1.5;
            var tempLeft = left / 1.5;
            var tempTop = top / 1.5;

            obj[i].set('scaleX', tempScaleX);
            dbgconsolelog("New ScaleX is: "+obj[i].get('scaleX'));
            obj[i].set('scaleY', tempScaleY);
            dbgconsolelog("New ScaleY is: "+obj[i].get('scaleY'));
            obj[i].set('left', tempLeft);
            dbgconsolelog("New left is: "+obj[i].get('left'));
            obj[i].set('top', tempTop);
            dbgconsolelog("New top is: "+obj[i].get('top'));
            if(obj[i] instanceof fabric.Pcarrow) {
                var thearrow = obj[i],
                    startShape = getShapeByID(thearrow.fromShape),
                    endShape = getShapeByID(thearrow.toShape),
                    startCtr = startShape.getCenterPoint();
                    endCtr = endShape.getCenterPoint();
                thearrow.set('x1', startCtr.x);
                thearrow.set('y1', startCtr.y);
                thearrow.set('x2', endCtr.x);
                thearrow.set('y2', endCtr.y);

                dbgconsolelog("New points: ["+obj[i].get('x1')+","+obj[i].get('y1')+","+obj[i].get('x2')+","+obj[i].get('y2')+"]");
            }
            obj[i].setCoords();
        }
        canvas.renderAll();
    },*/

    template: _.template('' +
        '<section class="middle-panel loged-in-user clearfix">' +
            '<div class="chart-container container">' +
                '<div class="row">' +
                    '<div class="col-xs-12 col-lg-12 text-center" id="chart-title">'+
                        //'<a href="#" id="inputTitle" data-type="text" data-pk="1" data-title=charttitle class="editable editable-click"><%= charttitle %></a>' +
                        '<h3 id="inputTitle" data-type="text" data-pk="1" data-title=charttitle style="display: inline"><%= charttitle %> - v<%=versionnumber%></h3>' +
                    '</div>' +
                    /*'<div class="col-xs-2 hidden-lg">' +
                        '<button type="button" class="collapsed" data-toggle="collapse" data-target="#chart-submenu">' +
                            '<span class="sr-only">Toggle navigation</span>' +
                            '<span class="icon-bar"></span>' +
                            '<span class="icon-bar"></span>' +
                            '<span class="icon-bar"></span>' +
                        '</button>' +
                    '</div>' +*/
                    '<div class="col-xs-12"><div id="chart-submenu-wrapper"><div class="collapse" id="chart-submenu"><div class="row">' +
                        //'<div class="chart-submenu-section col-lg-4 col-lg-push-4 did-it-work" id="did-it-work">'+ //hidden-xs hidden-sm hidden-md col-lg-4
                            //'<h5 class="bottom-txt"><span class="green"><%= posvotes %></span> / <span class="red"><%= negvotes %></span></h5>'+
                        //'</div>'+
                        //'<div class="chart-submenu-section col-lg-4 col-lg-pull-4 text-center">' + //hidden-xs hidden-sm hidden-md col-lg-4
                            //'<div class="left-box">' +
                                //'<input name="" value="" class="width-m" placeholder="Enter Chart Title Here" type="text">'+

                                //'<div class="row">'+
                                //'<div class="col-md-12">'+
                                //'<div class="row">'+
                                    //'<div class="col-md-12">'+
                                        //'<div class="addthis_sharing_toolbox">'+
                                            //'<a class="addthis_button_facebook"></a>'+
                                            //'<a class="addthis_button_twitter"></a>'+
                                            //'<a class="addthis_button_google_plusone_share"></a>'+
                                            //'<a class="addthis_button_pinterest_share"></a>'+
                                        //'</div>'+
                                    //'</div>'+
                                //'</div>' +
                            //'</div>' +
                        //'</div>' +
                        '<div class="chart-submenu-section col-lg-offset-4 text-center">' + //hidden-xs hidden-sm hidden-md col-lg-4
                            '<div id="chart-actions-wrapper">' +
                                //'<div id="atstbx" class="at-share-tbx-element addthis_32x32_style addthis-smartlayers animated at4-show"><a class="at-share-btn at-svc-facebook"><span class="at300bs at15nc at15t_facebook" title="Facebook"></span></a><a class="at-share-btn at-svc-twitter"><span class="at300bs at15nc at15t_twitter" title="Twitter"></span></a><a class="at-share-btn at-svc-google_plusone_share"><span class="at300bs at15nc at15t_google_plusone_share" title="Google+"></span></a><a class="at-share-btn at-svc-pinterest_share"><span class="at300bs at15nc at15t_pinterest_share" title="Pinterest"></span></a></div></div>'+
                                //'<a class="pc-btn blue" href="/chart/<%= chartslug %>/edit" class="gray" id="editchart">Edit</a> ' +
                                //'<div class="flot-box"><a href="#" class="gray">Clone</a></div>' +
                                //'<a class="pc-btn blue" href="#" id="talkpage" class="gray">Discuss</a> ' +
                                //'<a class="pc-btn blue" href="/clone/<%= chartslug %>" id="clonechart" class="gray">Clone</a> ' +
                                '<a class="pc-btn blue" href="/clone/<%= chartslug %>/version/<%= versionnumber%>" id="clonechart" class="gray">Clone</a> ' +
                                '<a class="pc-btn blue" id="makecurrent" class="gray">Make Current</a> ' +
                                //'<a class="pc-btn blue" id="previousrevision" class="gray">Previous</a> ' +
                                //'<a class="pc-btn blue" id="nextrevision" class="gray">Next</a> ' +
                            //'<div class="flot-box" id="connecttool"><a href="#" class="gray">Connect Shapes</a></div>' +
                            //'<div class="flot-box" id="addtext"><a href="#" class="gray">Add Text</a></div>' +
                            //'<div class="flot-box" id="clearcanvas"><a href="#" class="gray">Clear Canvas</a></div>' +
                            //'<div class="flot-box"><a href="#" class="dropdown-toggle gray" data-toggle="dropdown">Share</a>'+
                            //'<ul class="dropdown-menu">'+
                            //'<li><a href="#">Facebook</a></li>'+
                            //'<li><a href="#">Twitter</a></li>'+
                            //'<li><a href="#">Dropbox</a></li>'+
                            //'<li><a href="#">Google Drive</a></li>'+
                            //'</ul>'+
                            //'</div>'+
                            '</div>' +
                        '</div>' +
                    '</div></div></div></div>' +
                    '<div id="chart-submenu-dropdown" class="col-xs-12 hidden-lg collapsed text-center" data-toggle="collapse" data-target="#chart-submenu"><span class="caret large"></span></div>' +
                '</div>' +
                '<div class="row">'+
                    '<div class="col-xs-12 tagshowbox">'+
                        '<% _.each(this.model.get("tags"), function(i) { %>  <a href="/search/tags/<%= tagLinkFormatter(i) %>"><span class="label label-primary"><%= i %></span></a> <% }); %>'+
                    '</div>'+
                '</div>'+
                '<div class="row user-top-row offcanvas-wrapper offcanvas-wrapper-right">' +
                    '<div id="toast-wrapper">' +
                        '<div id="toast-container"></div>' +
                    '</div>' +
                    '<div class="col-lg-12 col-md-8 col-xs-12">' +
                        '<div class="row">' +
                            '<div class="work-space">' +
                                '<div class="col-lg-12 text-center work-section-header"><div style="background-color: #DDDDDD; border-top-right-radius: 5px; border-top-left-radius: 5px;">Click a shape for more information</div></div>' +
                                '<div class="col-lg-12">' +
                                    '<div class="work-section">' +
                                        '<div class="container-canvas" id="view-canvas-wrapper">' +
                                            '<canvas id="main-canvas">This is the canvas</canvas>' + // width="1300" height="750"
                                        '</div>' +
                                        '<div class="secondarypopups" id="secondarypopups"></div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="hidden-lg col-xs-12"><h4 class="text-center" id="canvas-navigation-header"></h4></div>' +
                                '<div class="hidden-lg col-xs-12">' +
                                    '<div class="row" id="canvas-navigation-wrapper">' +
                                        /*'<div class="col-xs-4" id="nav-prev-button">' +
                                            '<p>Previous</p>' +
                                        '</div>' +
                                        '<div class="col-xs-2" id="nav-yes-button">' +
                                            '<p>Yes</p>' +
                                        '</div>' +
                                        '<div class="col-xs-2" id="nav-no-button">' +
                                            '<p>No</p>' +
                                        '</div>' +
                                        '<div class="col-xs-4" id="nav-next-button">' +
                                            '<p>Next</p>' +
                                        '</div>' +*/
                                    '</div>' +
                                '</div>' +
                                '<img class="hidden-image" src="http://s3.amazonaws.com/properchannel-img/<%= imgurl %>">'+
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-lg-5 col-md-4 col-xs-10 offcanvas-sidebar"><div id="extras-sidebar" class="sidebar-content">' +
                        '<div class="panel-header">' +
                            '<span class="panel-title">More Info</span>' +
                        '</div>' +
                        '<div class="panel-content"><h4 class="text-center">Click a shape in the chart for more information</h4></div>' +
                    '</div></div>' +
                '</div>' +
            '</div>' +
        '</section>')
})

App.VoteMenuView = Backbone.View.extend({
    events: {
        'click .vote-positive': 'upvoteChart',
        'click .vote-negative': 'downvoteChart'
    },

    el: $('#did-it-work'),

    initialize: function() {
        dbgconsolelog("Initializing Vote menu for chart "+this.model.get('title'));
        this.render();
        //_.defer(function() {addthis.toolbox('.addthis_sharing_toolbox'); });
        //this.model.on('change: positive_votes change:negative_votes', dbgconsolelog("Votes changed!"));
    },

    render: function() {
        dbgconsolelog("Rendering Vote menu");
        this.$el.html(this.template({
            posvotes: this.model.get('positive_votes'),
            negvotes: this.model.get('negative_votes')
            })
        )
        if (window.addthis) {
            window.addthis = null;
            window._adr = null;
            window._atc = null;
            window._atd = null;
            window._ate = null;
            window._atr = null;
            window._atw = null;
        }
        var addthisurl = "http://s7.addthis.com/js/300/addthis_widget.js#pubid=ra-53a015e53771df6c";
            $.getScript(addthisurl).done(function(script) {
                addthis.toolbox('.addthis_toolbox');
                addthis.addEventListener('addthis.ready', readyEventHandler);
                addthis.addEventListener('addthis.menu.share', shareEventHandler);
            })
        //addthis.toolbox('.addthis_sharing_toolbox');
    },

    upvoteChart: function(e) {
        var thischartslug = this.model.get('slug');
        var posturl = '/api/chart/'+thischartslug+'/vote';
        var theview = this;

        currentUser.fetch({
            success: function() {
                if(currentUser.get('email') === "none") {
                    Messenger().post({
                        message: "Please login or register to vote on charts!",
                        type: "error",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                }
                else {
                    dbgconsolelog("OK to upvote! Logged in as "+currentUser.get('username'));
                    $.ajax({
                        method: 'POST',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: posturl,
                        data: {
                            value: 1
                        },
                        success: function(response) {
                            dbgconsolelog(response);
                            theview.model.fetch({
                                success: function() {
                                    theview.render();
                                }
                            });
                        },
                        fail: function(response) {
                            dbgconsolelog(response);
                        }
                    })
                }
            }
        })
    },

    downvoteChart: function(e) {
        var thischartslug = this.model.get('slug');
        var posturl = '/api/chart/'+thischartslug+'/vote';
        var theview = this;

        currentUser.fetch({
            success: function() {
                if(currentUser.get('email') === "none") {
                    Messenger().post({
                        message: "Please login or register to vote on charts!",
                        type: "error",
                        showCloseButton: true,
                        hideAfter: 5,
                        hideOnNavigate: true
                    });
                }
                else {
                    dbgconsolelog("OK to upvote! Logged in as "+currentUser.get('username'));
                    $.ajax({
                        method: 'POST',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: posturl,
                        data: {
                            value: -1
                        },
                        success: function(response) {
                            dbgconsolelog(response);
                            theview.model.fetch({
                                success: function() {
                                    theview.render();
                                }
                            });
                        },
                        fail: function(response) {
                            dbgconsolelog(response);
                        }
                    })
                }
            }
        })
    },

    /*template: _.template('' + //'<h3 class="head-did">Did it Work?</h3>'+
                                '<h4 class="header"><span class="green"><%= posvotes %></span></h4><div class="diamond-btn"><div class="inner-box green-bx"><a href="#" class="green" data-toggle="modal" data-target="#yesModal">Yes</a></div></div><h4 class="header">&nbsp;&nbsp;&nbsp;Did it work?&nbsp;&nbsp;&nbsp;</h4>'+
                                '<div class="diamond-btn"><div class="inner-box red-bx"><a href="#" class="red" data-toggle="modal" data-target="#noModal">No</a></div></div><h4 class="header"><span class="red"><%= negvotes %></span></h4>')*/
    template: _.template('<span class="green vote-count vote-positive"><%= posvotes %></span>' +
                         '<span class="green vote-icon vote-positive glyphicon glyphicon-arrow-up"></span>' +
                         '<span class="diw-header">Did it work?</span>' +
                         '<span class="red vote-icon vote-negative glyphicon glyphicon-arrow-down"></span>' +
                         '<span class="red vote-count vote-negative"><%= negvotes %></span>')
})

App.ShapeMenuView = Backbone.View.extend({
    tagName: 'ul',
    className: 'dropdown-menu',

    template: _.template('\
            <li><a tabindex="-1" href="#" class="addtextshape">Add/Edit Text</a></li>\
            <li><a tabindex="-1" href="#" class="deleteshape">Delete</a></li>\
            <li><a tabindex="-1" href="#" class="copyshape">Copy</a></li>'),

    startShapeTemplate: _.template('\
            <li><a tabindex="-1" href="#" class="addtextshape">Add/Edit Text</a></li>'),

    viewpagetemplate: _.template('\
            <li><a tabindex="-1" href="#" class="showshapesecondary">Show More</a></li>'),

    initialize: function() {
        dbgconsolelog('Initializing ShapeMenuView');
        this.listenTo(this.model, 'destroy', this.remove);
        this.secondaryviews = [];
        //this.render();
    },

    render: function() {
        dbgconsolelog('Rendering ShapeMenuView');
        var thisidstring = 'dropdown-' + this.model.get('id');
        var shapeObj = getShapeByID(this.model.get('id'));

        if ($(thisidstring).length > 0) {
            dbgconsolelog('Warning! A menu with id' + idstring + 'already exists!');
            console.trace();
        }
        $(this.el).attr('id', thisidstring).attr('role', 'menu');
        if(onviewpage) {
            dbgconsolelog("Showing view menu");
            $(this.el).html(this.viewpagetemplate({
                id: this.model.get('id'),
                type: (this.model.get('typename')).slice(2),
                langle: '<',
                rangle: '>'
            }));
            $()
        } else {
            dbgconsolelog("Showing non-view menu");
            if (this.model.get('typename') != 'pcrect') {
                $(this.el).html(this.template({
                    id: this.model.get('id'),
                    type: (this.model.get('typename')).slice(2),
                    langle: '<',
                    rangle: '>'
                }));
            }
            else {
                $(this.el).html(this.startShapeTemplate({
                    id: this.model.get('id'),
                    type: (this.model.get('typename')).slice(2),
                    langle: '<',
                    rangle: '>'
                }));
            }
        }
        return this;
    },

    events: {
        'click a.deleteshape': 'deleteShapeFromMenu',
        'click a.showshapesecondary': 'openShapeSecondary',
        'click a.addtextshape': 'addTextShape',
        'click a.copyshape': 'copyShapeFromMenu'
    },

    copyShapeFromMenu: function(e) {
        e.preventDefault();
        if (this.model.get('typename') != 'pcrect') {
            dbgconsolelog("Got request to copy shape");
            selectedObject = getShapeByID(this.model.get('id'));
            copiedObject = selectedObject.clone();
            copiedObject.set({
                "top": copiedObject.top - 10,
                "left": copiedObject.left - 10,
                "arrowsIn": [],
                "arrowsOut": [],
                "follows": [],
                "followedBy": [],
                "shapeId": getNextObjID()
                });
            dbgconsolelog(copiedObject);
        }
    },

    deleteShapeFromMenu: function(e) {
        e.preventDefault();

        if (this.model.get('typename') != 'pcrect') {
            dbgconsolelog("Deleting " + this.model.get('typename').slice(2) + " with id " + this.model.get('id'));
            shapecollection.get(this.model.get('id')).destroy();

            shapeToDelete = getShapeByID(this.model.get('id'));
            deleteShape(shapeToDelete);
        }
    },

    openShapeSecondary: function(e) {
        e.preventDefault();
        var self = this;
        var thisshape = getShapeByID(this.model.get('id'));
        /*self.$sidebarEl = $('#extras-sidebar-'+this.model.get('id'))*/

        if (!self.secondaryView) {

            if (!$('#extras-sidebar-'+this.model.get('id')+'.'+thisshape.type).length) {
                self.renderShapeSecondary();
                //self.$sidebarEl = $('#extras-sidebar-'+this.model.get('id'));
            }
            else {
                self.secondaryView = new App.SecondaryTextView({
                    el: '#extras-sidebar-'+this.model.get('id')+'.'+thisshape.type,
                    type: 'shape',
                    objectId: this.model.get('id'),
                    exists: true
                });
            }
        }

        if(onviewpage) {
            highlightShape(thisshape);
        }

        $('.sidebar-content').hide();
        //self.$sidebarEl.fadeIn();
        self.secondaryView.$el.fadeIn();
        $('.offcanvas-wrapper').addClass('active');
    },

    /*close: function() {
        $('.offcanvas-wrapper').removeClass('active');
        //this.$sidebarEl.fadeOut();
        if (this.type === "shape") {
            dbgconsolelog("thisshape = "+thisshape);
            removeHighlightFromShape(thisshape);
        } else if (this.type === "arrow") {
            dbgconsolelog("thisarrow = "+this.arrow);
            removeHighlightFromArrow(thisarrow);
        } else {
            dbgconsolelog("Unsupported type!");
        }
        canvas.renderAll();
    },*/

    renderShapeSecondary: function() {
        //e.preventDefault();
        var thisshape = getShapeByID(this.model.get('id'));
        dbgconsolelog("Secondary text to display: " + thisshape.secondaryText);
        //var titlestring = (this.model.get('typename')).slice(2) + 'with id: ' + this.model.get('id');
        var thislabel = thisshape.get('labelText');
        var thissecondary = thisshape.get('secondaryText');
        var thisid = thisshape.get('shapeId');
        var shapeColor = {"pccircle": "blue", "pcrect": "green", "pctriangle": "pink"};

        // TODO: Rework this logic for both shapes and arrows as well as the tlak page. This causes redundant "close" operations and is a memory leak from the accumulation and duplication of views.
        this.secondaryView = new App.SecondaryTextView({
            title: (thislabel && thislabel.length > 0) ? thislabel : "---",
            text: (thissecondary && thissecondary.length > 0) ? thissecondary : "---",
            id: 'extras-sidebar-'+thisid,
            type: 'shape',
            className: 'sidebar-content ' + thisshape.type,
            objectId: thisid,
            color: shapeColor[thisshape.type]//,
            //el: $('#extras-sidebar')
        });
        /*this.secondaryviews.push(stv);
        _.each(this.secondaryviews, function(sv) {
            dbgconsolelog("Secondary views is now: " + sv.title);
        });
        stv.open();*/
        dbgconsolelog("Here is this menuview:");
        dbgconsolelog(this);
    },

    addTextShape: function(e) {
        e.preventDefault();
        dbgconsolelog('id was '+this.model.get('id'));
        itemToLabel = getShapeByID(this.model.get('id'));
        dbgconsolelog(itemToLabel);
        //var thisshapegrp = getGroupContainingShape(itemToLabel.get('id'));
        dbgconsolelog('Showing add text dialog for shape: ' + itemToLabel.get('type') + " with ID " + itemToLabel.get('shapeId'));

        dbgconsolelog("Attaching text to target " + itemToLabel.type + " with ID " + itemToLabel.shapeId);
        if (itemToLabel.labelText) {
            dbgconsolelog("Label text exists");
            $("#inputLabelText").val(itemToLabel.labelText);
        } else if ($("#inputLabelText").val()) {
            $("#inputLabelText").val('');
        }
        if (itemToLabel.secondaryText) {
            dbgconsolelog("Secondary text exists");
            $("#inputSecondaryText").editable('setHTML',itemToLabel.secondaryText);
        } else if ($("#inputSecondaryText").val()) {
            $("#inputSecondaryText").editable('setHTML','');
        }
        $("#myModal").modal({backdrop: 'static'});
        canvas.renderAll();
        canvas.deactivateAll();
        //canvas.setActiveObject(thisshapegrp);
        canvas.setActiveObject(itemToLabel);
        canvas.renderAll();
        canvas.deactivateAllWithDispatch();
        canvas.renderAll();
    },

    removeSecondaryViews: function() {
        dbgconsolelog("Secondary views is: " + this.secondaryviews + "with length " + this.secondaryviews.length);
        _.each(this.secondaryviews, function(secondaryview) {
            dbgconsolelog("Destroying secondary view: " + secondaryview);
            secondaryview.close();
            secondaryview.$el.empty();
            dbgconsolelog("Emptied el");
            if ($('#secondarypopups').length < 1) {
                dbgconsolelog("Secondary view entirely removed!");
                $('#contextmenus').after('<div class="secondarypopups" id="secondarypopups"></div>');
            }
            if (!($('#secondarypopups').children().length < 1)) {
                dbgconsolelog("Secondary view div not emptied!");
            }
            secondaryview.remove();
            this.secondaryviews = _.without(this.secondaryviews, secondaryview);
        })
    }
});

App.ArrowMenuView = Backbone.View.extend({
    tagName: 'ul',
    className: 'dropdown-menu',

    template: _.template('\
            <li><a tabindex="-1" href="#" class="addtextarrow">Add/Edit Text</a></li>\
            <li><a tabindex="-1" href="#" class="deletearrow">Delete</a></li>'),

    viewpagetemplate: _.template('\
            <li><a tabindex="-1" href="#" class="showarrowsecondary">Show More</a></li>'),

    initialize: function() {
        dbgconsolelog('Initializing ArrowMenuView');
        this.listenTo(this.model, 'destroy', this.remove);
        this.secondaryviews = [];
        //this.render();
    },

    render: function() {
        dbgconsolelog('Rendering ArrowMenuView');
        var thisidstring = 'dropdown-arrow-' + this.model.get('id');
        if ($(thisidstring).length > 0) {
            dbgconsolelog('Warning! A menu with id' + idstring + 'already exists!');
            console.trace();
        }
        $(this.el).attr('id', thisidstring).attr('role', 'menu');
        if(onviewpage) {
            this.$el.append(this.viewpagetemplate({
            id: this.model.get('id'),
            langle: '<',
            rangle: '>'
            }));
        } else {
            this.$el.append(this.template({
            id: this.model.get('id'),
            langle: '<',
            rangle: '>'
            }));
        }

        return this;
    },

    events: {
        'click a.deletearrow': 'deleteArrowFromMenu',
        'click a.showarrowsecondary': 'openArrowSecondary',
        'click a.addtextarrow': 'addTextArrow'
    },

    deleteArrowFromMenu: function(e) {
        e.preventDefault();
        var arrowtodeleteid = this.model.get('id');
        dbgconsolelog("Deleting arrow with id " + arrowtodeleteid);
        arrowcollection.get(arrowtodeleteid).destroy();

        arrowToDelete = getArrowByID(arrowtodeleteid);
        deleteArrow(arrowToDelete);
    },

    openArrowSecondary: function(e) {
        e.preventDefault();
        var self = this;
        var thisarrow = getArrowByID(this.model.get('id'));
        /*self.$sidebarEl = $('#extras-sidebar-'+this.model.get('id'))*/

        if (!self.secondaryView) {

            if (!$('#extras-sidebar-'+this.model.get('id')+'.pcarrow').length) {
                self.renderArrowSecondary();
                //self.$sidebarEl = $('#extras-sidebar-'+this.model.get('id'));
            }
            else {
                self.secondaryView = new App.SecondaryTextView({
                    el: '#extras-sidebar-'+this.model.get('id')+'.pcarrow',
                    type: 'arrow',
                    objectId: this.model.get('id'),
                    exists: true
                });
            }
        }

        if(onviewpage) {
            highlightArrow(thisarrow);
        }

        $('.sidebar-content').hide();
        //self.$sidebarEl.fadeIn();
        self.secondaryView.$el.fadeIn();
        $('.offcanvas-wrapper').addClass('active');
    },

    renderArrowSecondary: function() {
        //e.preventDefault();
        var thisarrow = getArrowByID(this.model.get('id'));
        dbgconsolelog("Secondary text to display: " + thisarrow.secondaryText);
        //var titlestring = ('arrow with id: ' + this.model.get('id'));
        var thislabel = thisarrow.get('labelText');
        var thissecondary = thisarrow.get('secondaryText');
        this.secondaryView = new App.SecondaryTextView({
            title: (thislabel && thislabel.length > 0) ? thislabel : "---",
            text: (thissecondary && thissecondary.length > 0) ? thissecondary : "---",
            id: 'extras-sidebar-'+this.model.get('id'),
            className: 'sidebar-content pcarrow',
            objectId: this.model.get('id'),
            type: 'arrow' //,
            //el: $('#extras-sidebar')
        });
        /*this.secondaryviews.push(stv);
        _.each(this.secondaryviews, function(sv) {
            dbgconsolelog("Secondary views is now: " + sv.title);
        });*/

        //stv.open();
    },

    addTextArrow: function(e) {
        e.preventDefault();
        itemToLabel = getArrowByID(this.model.get('id'));
        dbgconsolelog('Showing add text dialog for arrow: ' + itemToLabel.get('type') + " with ID " + itemToLabel.get('arrowId'));

        dbgconsolelog("Attaching text to target " + itemToLabel.type + " with ID " + itemToLabel.arrowId);
        if (itemToLabel.labelText) {
            dbgconsolelog("Label text exists");
            $("#inputLabelText").val(itemToLabel.labelText);
        } else if ($("#inputLabelText").val()) {
            $("#inputLabelText").val('');
        }
        if (itemToLabel.secondaryText) {
            dbgconsolelog("Secondary text exists");
            $("#inputSecondaryText").editable('setHTML',itemToLabel.secondaryText);
        } else if ($("#inputSecondaryText").val()) {
            $("#inputSecondaryText").editable('setHTML','');
        }
        $("#myModal").modal({backdrop: 'static'});
        canvas.renderAll();
        canvas.deactivateAll();
        canvas.setActiveObject(itemToLabel);
        canvas.renderAll();
        canvas.deactivateAllWithDispatch();
        canvas.renderAll();
    },

    removeSecondaryViews: function() {
        _.each(this.secondaryviews, function(secondaryview) {
            dbgconsolelog("Destroying secondary view " + secondaryview);
            secondaryview.$el.empty();
            secondaryview.close();
            secondaryview.unbind();
            secondaryview.undelegateEvents();
            this.secondaryviews = _.without(this.secondaryviews, secondaryview);
        })
    }
});

App.SecondaryTextView = Backbone.View.extend({
    tagName: 'div',
    className: 'sidebar-content',

    //template: _.template('<h4><%= title %></h4><p><%= text %></p>'),

    /*template: _.template('<div class="panel-controls">\n<button class="pc-btn filled close-panel-button">\n<span class="glyphicon glyphicon-chevron-right"></span><span class="glyphicon glyphicon-chevron-right"></span>\n</button>\n<!--<button class="button toggle-panel-button">\n<i class="icon expand"> &laquo; </i><span class="visually-hidden">Expand this panel</span>\n<i class="icon collapse"> &raquo; </i><span class="visually-hidden">Collapse this panel</span>\n</button>-->\n</div>\n<div class="panel-content">\n<h4><%=title%></h4><p><%= text %></p></div>'),*/
    template: _.template('<div class="panel-header <%=color%>"><span class="panel-title"><%=title%></span><button class="panel-controls btn close-panel-button">\n<span class="glyphicon glyphicon-remove">\n</button></div>\n<div class="panel-content">\n<%= text %></div>'),

    events: {
        'click .close-panel-button': 'close'
    },

    initialize: function(options) {
        dbgconsolelog('Showing secondary text');
        _.extend(this, _.pick(options, "title", "text", "id", "type", "color"));
        this.$popupdiv = $('.offcanvas-sidebar');
        this.objectId = options.objectId;
        dbgconsolelog("this.id = "+this.objectId);

        if (this.type === "shape") {
            this.shape = getShapeByID(this.objectId);
            dbgconsolelog("this.shape = "+this.shape);
        } else if (this.type === "arrow") {
            this.arrow = getArrowByID(this.objectId);
            dbgconsolelog("this.arrow = "+this.arrow);
        } else {
            dbgconsolelog("Unsupported type!");
        }

        if (!options.exists) {
            this.render();
        }
    },

    render: function() {
        dbgconsolelog('Title for this view: ' + this.title + " and text: " + this.text);
        /*this.$el
            .hide()
            .addClass(this.className)
            .html(this.template({
                title: this.title,
                text: this.text
            }));*/
        //this.$el.attr('id', 'extras-sidebar-'+)
        this.$el.html(this.template({
                title: this.title,
                text: this.text,
                color: this.color
            }));

        //this.$el.css('top', '0').css("width", "600px");
        this.$popupdiv.append(this.$el);

        return this;
    },

    open: function() {
        var that = this;

        //this.$el.addClass('secondary-open');
        $('.offcanvas-wrapper').addClass('active');
        /*this.$el
            .show()
            .animate({
                'opacity': 1,
                'right': 0
            }, 250);*/
        this.$el.fadeIn();

        /*$(document).mouseup(function(e) {
            var container = $('#extras-sidebar');
            if (!container.is(e.target) && container.has(e.target).length === 0) {
                dbgconsolelog("Closing secondary view");
                that.close();
            }
        })*/
    },

    close: function() {
        /*this.$el
            .animate({
                'opacity': 0,
                'right': '-40px'
            }, 250, function() {
                $(this).hide();
            });*/
        //this.$el.removeClass('active');
        $('.offcanvas-wrapper').removeClass('active');
        //this.$el.fadeOut();
        if (this.type === "shape") {
            dbgconsolelog("thisshape = "+this.shape);
            removeHighlightFromShape(this.shape);
        } else if (this.type === "arrow") {
            dbgconsolelog("thisarrow = "+this.arrow);
            removeHighlightFromArrow(this.arrow);
        } else {
            dbgconsolelog("Unsupported type!");
        }
        canvas.renderAll();
        //$(document).off("mouseup");
    }
});

App.TalkPageView = Backbone.View.extend({
    tagName: 'div',
    className: 'secondary-panel',

    template: _.template('' +
        '<div class="panel-header">' +
            '<span class="panel-title">Comments</span>' +
            '<button class="panel-controls btn close-panel-button"><span class="glyphicon glyphicon-remove"></span></button>' +
        '</div>' +
        '<div class="panel-content">' +
            '<section id="comments" class="comments">'+
                '<div class="comments-view"><% _.each(chartcomments.models, function(c) { %>  <h4><%= c.get("author") %></h4><p><%= c.get("body") %></p><abbr class="timeago" title="<%=isoToLocal(c.get("created_iso"))%>"><%=moment.utc(c.get("created_iso")).local().format("LLL")%></abbr> <% }); %>'+
                    '<form id="submit-comment" role="form">'+
                        '<div class="form-group">'+
                            '<label class="sr-only" for"inputComment">Comment</label>'+
                            '<input type="text" class="form-control input-large" id="inputComment" placeholder="Enter your comment here">'+
                        '</div><br/>'+
                    '</form>'+
                    '<button type="button" class="btn btn-primary" id="save-comment">Save</button>' +
                '</div>' +
            '</section>' +
        '</div>'),

    events: {
        'click .close-panel-button': 'close',
        'click #save-comment': 'save'
    },

    initialize: function(options) {
        var view = this;
        dbgconsolelog('Showing talk page');
        //_.extend(this, _.pick(options, "comments"));
        dbgconsolelog("Will pass slug: "+this.model.get('slug'));
        this.chartcomments = new App.CommentsCollection([], {chartslug: this.model.get('slug')});
        dbgconsolelog(this.chartcomments);
        this.$popupdiv = $('#extras-sidebar');
        this.chartcomments.fetch({
            success: function() {
                view.render();
            }
        })
    },

    render: function() {
        this.chartcomments.fetch({
            success: function() {
                dbgconsolelog(this.chartcomments);
            }
        })
        var view = this;

        this.$el.html(this.template({
                chartcomments: view.chartcomments
            }));

        /*this.$el.css('top', '0').css("width", "600px");*/

        this.chartcomments.each(function(comment) {
            dbgconsolelog(comment.get('body'))});

        $("abbr.timeago").timeago();

        return this;
    },

    open: function() {
        var that = this;
        this.chartcomments.fetch({
            success: (function() {
                this.$el.html(this.template({
                    chartcomments: this.chartcomments
                }));
                $('.offcanvas-wrapper').addClass('active');
                //this.$el.addClass('secondary-open');
                $('#extras-sidebar').append(this.$el);
                /*this.$el
                    .show()
                    .animate({
                        'opacity': 1,
                        'right': 0
                    }, 250);*/
            }).bind(this)
        });

        /*$(document).mouseup(function(e) {
            var container = $('#extras-sidebar');
            if (!container.is(e.target) && container.has(e.target).length === 0) {
                dbgconsolelog("Closing talk page");
                that.close();
            }
        })*/
    },

    close: function() {
        /*this.$el
            .animate({
                'opacity': 0,
                'right': '-40px'
            }, 250, function() {
                $(this).hide();
            });
        this.$el.removeClass('secondary-open');
        $(document).off("mouseup");*/
        $('.offcanvas-wrapper').removeClass('active');
    },

    save: function() {
        theview = this;
        thecomments = this.chartcomments;

        dbgconsolelog("Saving comment: '"+$('#inputComment').val()+"'");
        Messenger().run({
          successMessage: 'Your comment was saved!',
          errorMessage: 'Error saving comment',
          progressMessage: 'Saving comment...',
          hideAfter: 3,
          hideOnNavigate: true
        }, {
            type: "POST",
            url: this.chartcomments.url(),
            data: {
                body: $('#inputComment').val()
            },

            success: function() {
                $('#inputComment').val('');
                thecomments.fetch({
                    success: function() {
                        theview.render().open()
                    }
                })
            },

            error: function(resp) {
                var theerror = JSON.parse(resp.responseText).message;
                return "Save failed! "+theerror;
            }
        });
    }
});

App.CommentView = Backbone.View.extend({});

Backbone.SingletonView = {
    getInstance: function(options) {
        if(this._instance === undefined) {
            this._instance = new this(options);
        }

        return this._instance;
    }
}

App.LoginMenuView = Backbone.View.extend({
    el: $('#login-menu-view'),

    events: {
        'click #loginButton' : 'submitLogin',
        'click #logoutButton' : 'logout'
    },

    initialize: function() {
        var that = this;
        this.model.fetch().done(function(){
            that.render();
            that.nameinput = $('input[name=username]');
            that.pwinput = $('input[name=password]');
            that.listenTo(that.model, "change", that.render);
        });
    },

    render: function() {
        var self = this;
        var defaultPic = self.defaultProfilePic();

        if(this.model.get('email') == 'none') {
            this.$el.addClass('login-dd').html(
                this._notLoggedInTemplate({
                    currentuser: this.model
                })
            );
        } else {
            this.$el.addClass('login-dd').html(
                this._loggedInTemplate({
                    currentuser: this.model,
                    defaultPic: this.defaultProfilePic()
                })
                );
            var authorView = new App.UserProfileShortView({
                model: self.model
            });

            self.$el.find('#login-menu-badge').html(authorView.render().el);
        }

    },

    submitLogin: function(e) {
        $('.nav-login-errors').empty();
        var that = this;

        e.preventDefault();
        var sendEmail = $('input[name=username]').val();
        var sendPassword = $('input[name=password]').val();

        dbgconsolelog("Username was "+sendEmail+" and password was "+sendPassword);

        $.ajax({
            type: 'POST',
            contentType: "application/json",
            url: '/login2',
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true,
            data: JSON.stringify({
                'email': sendEmail,
                'password': sendPassword
                })
            })
            .done(function(data) {
                dbgconsolelog("Login sent! Response was: " + JSON.stringify(data));
                that.model.fetch({
                    success: function() {
                        window.PCTrack.user = {id: that.model.get('id'), email: that.model.get('email'), username: that.model.get('username')};
                        dbgconsolelog("Logged in as: "+currentUser.get('email')+"/"+currentUser.get('username'));
                        analytics.identify(window.PCTrack.user.id.toString(), {
                            email: window.PCTrack.user.email,
                            username: window.PCTrack.user.username
                        });
                        location.reload(true);
                    }
                });
                //App.navigate('/');
            })
            .fail(function(data) {
                dbgconsolelog(data);
                dbgconsolelog("Status was: "+ data.status);
                if (data.status == 400 || data.status == 401) {
                    // authentication failed
                    dbgconsolelog("Login failed! " + JSON.parse(data.responseText).errors.message);
                    $('.nav-login-errors').append('<li>'+JSON.parse(data.responseText).errors.message+'</li>')
                }
            })
    },

    logout: function(e) {
        var that = this;
        e.preventDefault();
        $.ajax({
            type: 'GET',
            url: '/logout'
        })
        .done(function(data) {
            window.PCTrack.user = {id: 0};
            that.model.fetch().done(function() {
                location.reload(true);
            });
        })
        .fail(function(data) {
            dbgconsolelog(data);
        })
    },

    defaultProfilePic: function() {
        var defaultPics = ['profile-pic-default-decision.png', 'profile-pic-default-start.png', 'profile-pic-default-step.png'];

        return '/static/omfiles/images/' + defaultPics[Math.floor((Math.random() * defaultPics.length))];
    },

    /*_notLoggedInTemplate: _.template(''+
              '<a class="pink" title="" data-placement="bottom" data-toggle="popover" href="#">Login <b class="caret"></b></a>'+
            '<!--<button data-content="Vivamus sagittis lacus vel augue laoreet rutrum faucibus." data-placement="bottom" data-toggle="popover" data-container="body" class="btn btn-default" type="button" data-original-title="" title="">'+
          'Popover on bottom'+
        '</button>-->'+
            '<div class="popover bottom">'+
        '<div class="arrow"></div>'+
        '<h3 class="popover-title">Existing Members Login - <%= currentuser.get("username") %></h3>'+
        '<div class="popover-content">'+
          '<div class="box-top">'+
                    '<input name="username" value="" placeholder="Email" type="text">'+
                    '<input name="password" value="" placeholder="Password" type="password">'+
                    //'<h4>Do you want to be added to email lists for</h4>'+
                    //'<div class="clearfix">'+
                    //'<input name="" type="checkbox" value="Major Announcements">'+
                    //'<label for="Announcements">Major Announcements</label>'+
                    //'</div>'+
                    //'<div class="clearfix">'+
                    //'<input name="" type="checkbox" value="Blog (about once a week)">'+
                    //'<label for="Blog">Blog (about once a week)</label>'+
                    //'</div>'+
                    '<div class="btn login-btn"><a href="#" id="loginButton" title="Login">Login</a></div>'+
                    '<div class="btn create-account"><a href="<%=protocolString+rootURL%>/register" class="btn" title="Create Account">Create Account</a>'+
                  '</div>'+
                  //'<div class="bottom-box clearfix"> '+
                  //'<div class="left-box">'+
                  //'<h2>Or Login Using </h2>'+
                  //'<div class="other-login"><a href="#"><img src="<%= protocolString+rootURL + "/static/omfiles/images/google-plus-icon.png" %>" width="32" height="32" alt=""></a> <a href="#"><img src="<%= protocolString+rootURL + "/static/omfiles/images/facebook-icon.png"%>" width="32" height="32" alt=""></a></div>'+
                  //'</div>'+
                  //'<div class="right-box">'+
                  //'<h3>Create Account</h3>'+
//'<div class="btn create-account"><a href="/register" class="btn" title="Create Account">Create Account</a>'+
//'</div>'+
'</div>'+
                  '</div>'+
        '</div>'+
      '</div>'
        ),
*/
    _notLoggedInTemplate: _.template(''+
        '<a class="blue" title="Login / Register" data-toggle="dropdown" href="#">Login <b class="caret"></b></a>'+
        '<div id="nav-login-dropdown" class="dropdown-menu">'+
            '<h4 class="">Member Login</h4>'+
            '<div class="">'+
            '<form class="navbar-form">'+
                '<input name="username" value="" placeholder="Email" type="text">'+
                '<input name="password" value="" placeholder="Password" type="password">'+
                '<ul class="nav-login-errors"></ul>'+
                '<a href="/reset">Forgot Password</a>'+
                '<div class="clearfix" style="margin-top: 10px">' +
                    '<input class="pc-btn blue filled float-r" id="loginButton" type="submit" value="Login"></input>'+
                    '<a class="pc-btn green filled float-l" href="/register" title="Create Account">Create Account</a>'+
                '</div>' +
            '</form>'+
            '</div>'+
        '</div>'
    ),

    _loggedInTemplate: _.template(''+
              /*'<a class="pink" title="" data-placement="bottom" data-toggle="popover" href="#"><span class="glyphicon glyphicon-user"></span> My Account <b class="caret"></b></a>'+
            '<!--<button data-content="Vivamus sagittis lacus vel augue laoreet rutrum faucibus." data-placement="bottom" data-toggle="popover" data-container="body" class="btn btn-default" type="button" data-original-title="" title="">'+
          'Popover on bottom'+
        '</button>-->'+
            '<div class="popover bottom">'+
                '<div class="arrow"></div>'+
                '<h3 class="popover-title">Logged In As: <%= currentuser.get("username") %></h3>'+
                '<div class="popover-content">'+
                    '<div class="box-top">'+
                        '<div class="btn login-btn"><a href="#" class="btn" id="logoutButton" title="Logout">Logout</a></div>'+
                    '</div>'+
                    '<div class="bottom-box clearfix"> '+
                    '</div>'+
                '</div>'+
            '</div>'*/
        '<a id="navbar-profile" class="" title="Login / Register" data-toggle="dropdown" href="javascript:void(0);" style="background-image:url(\'<%= currentuser.get("profile_image_url") ? profile_image_prefix+currentuser.get("profile_image_url") : defaultPic %>\');"></a>'+
        '<div id="nav-login-dropdown" class="dropdown-menu">'+
            //'<h4 class="">Logged in as: <a href="/profile/<%= currentuser.get("username") %>"><strong><%= currentuser.get("username") %></strong></a></h4>'+
            '<div id="login-menu-badge"></div>' +
            '<div class="">'+
            '<form class="navbar-form">'+
                '<div class="pc-btn blue filled" id="logoutButton" title="Logout">Logout</div>'+
                //'<div class="btn create-account"><a href="/profile/<%= currentuser.get("username") %>" class="btn" id="profileButton" title="Go to Profile">Go to Profile</a></div>'+
            '</form>'+
            '</div>'+
        '</div>'
    )

});

_.extend(App.LoginMenuView, Backbone.SingletonView);

//var indexView = new App.IndexView();
//var menuView = new App.ListButtonView({el: $('#chartlist')});
//var newchartview = new App.NewChartView({el: $('#newchartbtn')});

//Divide text into phrases based on max width of rect
function splitLinesShape(ctx, inputtext, inputShape, textStyle) {
    var shapeHeight = inputShape.height,
        shapeWidth = inputShape.width -20;

    if (inputtext.length < 1) {
        return [""];
    } else {
        var wa = inputtext.split(" "),
            phraseArray = [],
            lastPhrase = "",
            l = shapeWidth,
            measure = 0;

        ctx.font = textStyle;

        if(inputShape.type === "pccircle") {
            for (var i = 0; i < wa.length; i++) {
                var w = wa[i];
                measure = ctx.measureText(lastPhrase + w).width;
                if (measure < l) {
                    lastPhrase += (" " + w);
                } else {
                    phraseArray.push(lastPhrase);
                    lastPhrase = w;
                }
                if (i === wa.length - 1) {
                    phraseArray.push(lastPhrase);
                    break;
                }
            }
        }
        else if (inputShape.type === "pcrect") {
            var plusMinus1Length = Math.floor((5*shapeWidth)/6),
                multiline = false;
            if(ctx.measureText(inputtext).width > l) {
                multiline = true;
            }
            if(multiline) {
                var currline = 0;
                for (var i = 0; i < wa.length; i++) {
                    var w = wa[i],
                        checkwidth;
                    if (currline===1) {
                        checkwidth = l;
                    } else {
                        checkwidth = plusMinus1Length;
                    }
                    measure = ctx.measureText(lastPhrase + w).width;
                    if (measure < checkwidth) {
                        lastPhrase += (" " + w);
                    } else {
                        phraseArray.push(lastPhrase);
                        lastPhrase = w;
                        currline++;
                    }
                    if (i === wa.length - 1) {
                        phraseArray.push(lastPhrase);
                        break;
                    }
                }
            } else {
                for (var i = 0; i < wa.length; i++) {
                    var w = wa[i];
                    measure = ctx.measureText(lastPhrase + w).width;
                    if (measure < l) {
                        lastPhrase += (" " + w);
                    } else {
                        phraseArray.push(lastPhrase);
                        lastPhrase = w;
                    }
                    if (i === wa.length - 1) {
                        phraseArray.push(lastPhrase);
                        break;
                    }
                }
            }
        }
        else if (inputShape.type === "pctriangle") {
            l -= 10;
            var plusMinus1Length = Math.floor((3*shapeWidth)/5),
                multiline = false;
            if(ctx.measureText(inputtext).width > l) {
                multiline = true;
            }
            if(multiline) {
                var currline = 0;
                for (var i = 0; i < wa.length; i++) {
                    var w = wa[i],
                        checkwidth;
                    if (currline===1) {
                        checkwidth = l;
                    } else {
                        checkwidth = plusMinus1Length;
                    }
                    measure = ctx.measureText(lastPhrase + w).width;
                    if (measure < checkwidth) {
                        lastPhrase += (" " + w);
                    } else {
                        phraseArray.push(lastPhrase);
                        lastPhrase = w;
                        currline++;
                    }
                    if (i === wa.length - 1) {
                        phraseArray.push(lastPhrase);
                        break;
                    }
                }
            } else {
                for (var i = 0; i < wa.length; i++) {
                    var w = wa[i];
                    measure = ctx.measureText(lastPhrase + w).width;
                    if (measure < l) {
                        lastPhrase += (" " + w);
                    } else {
                        phraseArray.push(lastPhrase);
                        lastPhrase = w;
                    }
                    if (i === wa.length - 1) {
                        phraseArray.push(lastPhrase);
                        break;
                    }
                }
            }
        }
        else {
            return "Invalid shape type!"
        }
        return phraseArray;
    }

}

/*Class extensions/declarations
 *
 *
 */

fabric.Pcrect = fabric.util.createClass(fabric.Object, fabric.Observable, {
    //originX: 'center',
    //originY: 'center',
    type: 'pcrect',

    initialize: function(src, options) {
        this.callSuper('initialize', options);
        options && this.set('inSidebar', options.inSidebar);
        options && this.set('hasControls', options.hasControls);
        options && this.set('labelText', options.labelText);
        options && this.set('secondaryText', options.secondaryText);
        options && this.set('shapeId', options.shapeId);
        options && this.set('follows', options.follows);
        options && this.set('followedBy', options.followedBy);
        options && this.set('arrowsIn', options.arrowsIn);
        options && this.set('arrowsOut', options.arrowsOut);
        options && this.set('tcolor', options.tcolor || '#000');
        options && this.set('thlcolor', options.thlcolor || '#000');
        this.highlight = false;

        //this.imgsrc = (this.secondaryText && this.secondaryText.length > 1) ? 'https://s3.amazonaws.com/propchan-shapes/start-shape-more.png' : 'https://s3.amazonaws.com/propchan-shapes/start-shape.png';
        //this.imghlsrc = (this.secondaryText && this.secondaryText.length > 1) ? 'https://s3.amazonaws.com/propchan-shapes/start-shape-more-hl.png' : 'https://s3.amazonaws.com/propchan-shapes/start-shape-hl.png';

        this.imgsrc = (this.secondaryText && this.secondaryText.length > 1) ? chart_shapes_root+'start-shape-more.png' : chart_shapes_root+'start-shape.png';
        this.imghlsrc = (this.secondaryText && this.secondaryText.length > 1) ? chart_shapes_root+'start-shape-more-hl.png' : chart_shapes_root+'start-shape-hl.png';

        //this.image = (this.secondaryText && this.secondaryText.length > 1) ? shape1image_more : shape1image;
        this.imagehl = (this.secondaryText && this.secondaryText.length > 1) ? hl1image_more : hl1image;

        this.image = fabric.util.createImage();
        //this.image = new Image();
        this.image.crossOrigin = 'anonymous';
        this.image.src = this.imgsrc;
        this.image.onload = (function() {
            this.width = this.image.width;
            this.height = this.image.height;
            dbgconsolelog("Width of rect: " + this.width + " and height: " + this.height);
            this.loaded = true;
            this.setCoords();
            this.fire('image:loaded');
            canvas.renderAll();
        }).bind(this);

    },

    toObject: function() {
        return fabric.util.object.extend(this.callSuper('toObject'), {
            inSidebar: this.inSidebar,
            hasControls: this.hasControls,
            labelText: this.labelText,
            secondaryText: this.secondaryText,
            shapeId: this.shapeId,
            follows: this.follows,
            followedBy: this.followedBy,
            arrowsIn: this.arrowsIn,
            arrowsOut: this.arrowsOut
        });
    },

    _render: function(ctx) {
        var that = this;
        //this.callSuper('_render', ctx);
        ctx.drawImage(this.highlight ? this.imagehl : this.image, -this.width / 2, -this.height / 2);
        ctx.font = '10pt Arial';
        ctx.fillStyle = this.highlight ? this.thlcolor : this.tcolor;
        ctx.textAlign = 'center';
        var thetext = this.labelText; //(this.secondaryText && this.secondaryText.length > 1) ? this.labelText+"*" :
        var phrases = splitLinesShape(ctx, thetext, this, ctx.font);
        if(phrases.length === 1) {
            ctx.fillText(phrases[0], 0, 0);
        } else {
            var line_offset = 10 * phrases;
            var line_height = 15;
            for (var i = 0; i < phrases.length; i++) {
                //dbgconsolelog("Rendering phrase \"" + phrases[i] + "\"");
                var offsetStart;

                if (phrases.length % 2 === 0) {
                    offsetStart = -(line_height/2) * (phrases.length / 2);
                }
                else {
                    offsetStart = -line_height * ((phrases.length-1) / 2);
                }
                ctx.fillText(phrases[i], 0, offsetStart+(line_height*i));
            }
        //ctx.fillText(this.labelText, -this.width / 8, 0);
        }
    }

});

fabric.Pcrect.fromObject = function(object) {
    return new fabric.Pcrect('https://s3.amazonaws.com/properchannel-shapes/shape-1.png', object);
    /*object.tcolor = textcolorarr[getParameterByName('tcolor')];
    object.thlcolor = textcolorarr[getParameterByName('thlcolor')];*/
    //return new fabric.Pcrect(altshapesdir + startsrcarr[getParameterByName('start') || 0], object);
};

fabric.Pcrect.async = false;

fabric.Pccircle = fabric.util.createClass(fabric.Object, fabric.Observable, {
    //originX: 'center',
    //originY: 'center',
    type: 'pccircle',

    initialize: function(src, options) {
        this.callSuper('initialize', options);
        options && this.set('inSidebar', options.inSidebar);
        options && this.set('hasControls', options.hasControls);
        options && this.set('labelText', options.labelText);
        options && this.set('secondaryText', options.secondaryText);
        options && this.set('shapeId', options.shapeId);
        options && this.set('follows', options.follows);
        options && this.set('followedBy', options.followedBy);
        options && this.set('arrowsIn', options.arrowsIn);
        options && this.set('arrowsOut', options.arrowsOut);
        options && this.set('tcolor', options.tcolor || '#000');
        options && this.set('thlcolor', options.thlcolor || '#000');
        this.highlight = false;

        this.imgsrc = (this.secondaryText && this.secondaryText.length > 1) ? chart_shapes_root+'step-shape-more.png' : chart_shapes_root+'step-shape.png';
        this.imghlsrc = (this.secondaryText && this.secondaryText.length > 1) ? chart_shapes_root+'step-shape-more-hl.png' : chart_shapes_root+'step-shape-hl.png';

        //this.image = (this.secondaryText && this.secondaryText.length > 1) ? shape2image_more : shape2image;
        this.imagehl = (this.secondaryText && this.secondaryText.length > 1) ? hl2image_more : hl2image;

        this.image = fabric.util.createImage();
        //this.image = new Image();
        this.image.crossOrigin = 'anonymous';
        this.image.src = this.imgsrc;
        this.image.onload = (function() {
            this.width = this.image.width;
            this.height = this.image.height;
            this.loaded = true;
            this.setCoords();
            this.fire('image:loaded');
            canvas.renderAll();
        }).bind(this);
    },

    toObject: function() {
        return fabric.util.object.extend(this.callSuper('toObject'), {
            inSidebar: this.inSidebar,
            hasControls: this.hasControls,
            labelText: this.labelText,
            secondaryText: this.secondaryText,
            shapeId: this.shapeId,
            follows: this.follows,
            followedBy: this.followedBy,
            arrowsIn: this.arrowsIn,
            arrowsOut: this.arrowsOut
        });
    },

    _render: function(ctx) {
        var that = this;
        //this.callSuper('_render', ctx);
        ctx.drawImage(this.highlight ? this.imagehl : this.image, -this.width / 2, -this.height / 2);
        ctx.font = '10pt Arial';
        ctx.fillStyle = this.highlight ? this.thlcolor : this.tcolor;
        ctx.textAlign = 'center';
        var thetext = this.labelText; //(this.secondaryText && this.secondaryText.length > 1) ? this.labelText+"*" :
        var phrases = splitLinesShape(ctx, thetext, this, ctx.font);
        if(phrases.length === 1) {
            ctx.fillText(phrases[0], 0, 0);
        } else {
            var line_offset = 10 * phrases;
            var line_height = 15;
            for (var i = 0; i < phrases.length; i++) {
                //dbgconsolelog("Rendering phrase \"" + phrases[i] + "\"");
                var offsetStart;

                if (phrases.length % 2 === 0) {
                    offsetStart = -(line_height/2) * (phrases.length / 2);
                }
                else {
                    offsetStart = -line_height * ((phrases.length-1) / 2);
                }
                ctx.fillText(phrases[i], 0, offsetStart+(line_height*i));
            }
        //ctx.fillText(this.labelText, -this.width / 8, 0);
        }
    }

});

fabric.Pccircle.fromObject = function(object) {
    return new fabric.Pccircle('https://s3.amazonaws.com/properchannel-shapes/canvas-shape-2.png', object);
    /*object.tcolor = textcolorarr[getParameterByName('tcolor')];
    object.thlcolor = textcolorarr[getParameterByName('thlcolor')];*/
};

fabric.Pccircle.async = false;

fabric.Pctriangle = fabric.util.createClass(fabric.Object, fabric.Observable, {
    //originX: 'center',
    //originY: 'center',
    type: 'pctriangle',

    initialize: function(src, options) {
        this.callSuper('initialize', options);
        options && this.set('inSidebar', options.inSidebar);
        options && this.set('hasControls', options.hasControls);
        options && this.set('labelText', options.labelText);
        options && this.set('secondaryText', options.secondaryText);
        options && this.set('shapeId', options.shapeId);
        options && this.set('follows', options.follows);
        options && this.set('followedBy', options.followedBy);
        options && this.set('arrowsIn', options.arrowsIn);
        options && this.set('arrowsOut', options.arrowsOut);
        options && this.set('tcolor', options.tcolor || '#000');
        options && this.set('thlcolor', options.thlcolor || '#000');
        this.highlight = false;

        this.imgsrc = (this.secondaryText && this.secondaryText.length > 1) ? chart_shapes_root+'decision-shape-more.png' : chart_shapes_root+'decision-shape.png';
        this.imghlsrc = (this.secondaryText && this.secondaryText.length > 1) ? chart_shapes_root+'decision-shape-more-hl.png' : chart_shapes_root+'decision-shape-hl.png';

        //this.image = (this.secondaryText && this.secondaryText.length > 1) ? shape3image_more : shape3image;
        this.imagehl = (this.secondaryText && this.secondaryText.length > 1) ? hl3image_more : hl3image;


        this.image = fabric.util.createImage();
        //this.image = new Image();
        this.image.crossOrigin = 'anonymous';
        this.image.src = this.imgsrc;
        this.image.onload = (function() {
            this.width = this.image.width;
            this.height = this.image.height;
            this.loaded = true;
            this.setCoords();
            this.fire('image:loaded');
            canvas.renderAll();
        }).bind(this);
    },

    toObject: function() {
        return fabric.util.object.extend(this.callSuper('toObject'), {
            inSidebar: this.inSidebar,
            hasControls: this.hasControls,
            labelText: this.labelText,
            secondaryText: this.secondaryText,
            shapeId: this.shapeId,
            follows: this.follows,
            followedBy: this.followedBy,
            arrowsIn: this.arrowsIn,
            arrowsOut: this.arrowsOut
        });
    },

    _render: function(ctx) {
        var that = this;
        //this.callSuper('_render', ctx);
        ctx.drawImage(this.highlight ? this.imagehl : this.image, -this.width / 2, -this.height / 2);
        ctx.font = '10pt Arial';
        ctx.fillStyle = this.highlight ? this.thlcolor : this.tcolor;
        ctx.textAlign = 'center';
        var thetext = this.labelText; //(this.secondaryText && this.secondaryText.length > 1) ? this.labelText+"*" :
        var phrases = splitLinesShape(ctx, thetext, this, ctx.font);
        if(phrases.length === 1) {
            ctx.fillText(phrases[0], 0, 0);
        } else {
            var line_offset = 10 * phrases;
            var line_height = 15;
            for (var i = 0; i < phrases.length; i++) {
                //dbgconsolelog("Rendering phrase \"" + phrases[i] + "\"");
                var offsetStart;

                if (phrases.length % 2 === 0) {
                    offsetStart = -(line_height/2) * (phrases.length / 2);
                }
                else {
                    offsetStart = -line_height * ((phrases.length-1) / 2);
                }
                ctx.fillText(phrases[i], 0, offsetStart+(line_height*i));
            }
        //ctx.fillText(this.labelText, -this.width / 8, 0);
        }
    }

});

fabric.Pctriangle.fromObject = function(object) {
    return new fabric.Pctriangle('https://s3.amazonaws.com/properchannel-shapes/canvas-shape-3.png', object);
    /*object.tcolor = textcolorarr[getParameterByName('tcolor')];
    object.thlcolor = textcolorarr[getParameterByName('thlcolor')];*/
};

fabric.Pctriangle.async = false;

fabric.Pcarrow = fabric.util.createClass(fabric.Line, {
    type: 'pcarrow',

    initialize: function(points, options) {
        dbgconsolelog("Points is: " + JSON.stringify(points) + " and options is: " + JSON.stringify(options));
        if (!(points instanceof Array)) {
            //dbgconsolelog("Points is not array");
            options = points;
            points = [options.x1, options.y1, options.x2, options.y2];
        } else {
            //dbgconsolelog("Points is array.");
        }
        dbgconsolelog("Points is: [" + points[0] + "," + points[1] + "," + points[2] + "," + points[3] + "]");
        this.callSuper('initialize', points, options);
        options && this.set('arrowId', options.arrowId);
        options && this.set('fromShape', options.fromShape);
        //options && this.set('fromHandle', options.fromHandle);
        options && this.set('toShape', options.toShape);
        //options && this.set('toHandle', options.toHandle);
        options && this.set('labelText', options.labelText);
        options && this.set('secondaryText', options.secondaryText);
        options && this.set('hasControls', options.hasControls);
        options && this.set('hasBorders', options.hasBorders);
        options && this.set('lockMovementX', options.lockMovementX);
        options && this.set('lockMovementY', options.lockMovementY);
        options && this.set('height', options.height);
        options && this.set('width', options.width);
        options && this.set('perPixelTargetFind', options.perPixelTargetFind);

    },

    toObject: function() {
        return fabric.util.object.extend(this.callSuper('toObject'), {
            arrowId: this.arrowId,
            fromShape: this.fromShape,
            toShape: this.toShape,
            //fromHandle: this.fromHandle,
            //toHandle: this.toHandle,
            labelText: this.labelText,
            secondaryText: this.secondaryText,
            hasControls: this.hasControls,
            hasBorders: this.hasBorders,
            lockMovementX: this.lockMovementX,
            lockMovementY: this.lockMovementY,
            height: this.height,
            width: this.width,
            perPixelTargetFind: this.perPixelTargetFind
        });
    },

    /*getStartAndEnd: function() {
        foundStartPoint = myIntersectionPoint(this, getShapeByID(this.fromShape));
        foundEndPoint = myIntersectionPoint(this, getShapeByID(this.toShape));
        dbgconsolelog("Found start point: ");
        dbgconsolelog(foundStartPoint);
        dbgconsolelog("Found end point: ");
        dbgconsolelog(foundEndPoint);
        return [foundStartPoint, foundEndPoint];
    },*/

    _render: function(ctx) {
        var startPoint, endPoint;

        if (!this.stroke) {
            this.stroke = this.fill;
        }

        //var startPoint = new fabric.Point(this.x1, this.y1);
        //var endPoint = new fabric.Point(this.x2, this.y2);
        /*(function() {
            var startend = that.getStartAndEnd();
            startPoint = startend[0];
            endPoint = startend[1];
            dbgconsolelog("Start determined to be: ");
            dbgconsolelog(startPoint);
            dbgconsolelog("End determined to be: ");
            dbgconsolelog(endPoint);
            dfd.resolve();
        })();
        dfd.done(function() {
            */


        startPoint = myIntersectionPoint(this, getShapeByID(this.fromShape));
        endPoint = myIntersectionPoint(this, getShapeByID(this.toShape));
        //dbgconsolelog("Start point at: "+startPoint.x+","+startPoint.y);
        //dbgconsolelog("End point at: "+endPoint.x+","+endPoint.y);
        //debugAddCircle(startPoint.x, startPoint.y);
        //debugAddCircle(endPoint.x, endPoint.y);
        //canvas.renderAll();


        var drawWidth = Math.abs(endPoint.x - startPoint.x) || 1;
        var drawHeight = Math.abs(endPoint.y - startPoint.y) || 1;

        var xdiff = endPoint.x - startPoint.x;
        var ydiff = endPoint.y - startPoint.y;
        var lineangle = Math.atan2(ydiff, xdiff);

        var h = Math.abs(arrowLength / Math.cos(arrowangle));
        //dbgconsolelog("Hyp length is " + h);

        var ang1 = lineangle + Math.PI + arrowangle;
        var topx = endPoint.x + Math.cos(ang1) * h;
        var topy = endPoint.y + Math.sin(ang1) * h;

        var ang2 = lineangle + Math.PI - arrowangle;
        var botx = endPoint.x + Math.cos(ang2) * h;
        var boty = endPoint.y + Math.sin(ang2) * h;

        ctx.beginPath();

        var isInPathGroup = this.group && this.group.type === 'path-group';
        if (isInPathGroup && !this.transformMatrix) {
            ctx.translate(-this.group.width / 2 + this.left, -this.group.height / 2 + this.top);
        }

        if (!this.strokeDashArray || this.strokeDashArray && supportsLineDash) {

            // move from center (of virtual box) to its left/top corner
            // we can't assume x1, y1 is top left and x2, y2 is bottom right
            /*var xMult = startPoint.x <= endPoint.x ? -1 : 1;
            var yMult = startPoint.y <= endPoint.y ? -1 : 1;
            ctx.moveTo(
                drawWidth === 1 ? 0 : (xMult * drawWidth / 2),
                drawHeight === 1 ? 0 : (yMult * drawHeight / 2));
            ctx.lineTo(
                drawWidth === 1 ? 0 : (xMult * -1 * drawWidth / 2),
                drawHeight === 1 ? 0 : (yMult * -1 * drawHeight / 2));*/

            ctx.moveTo(startPoint.x - this.left, startPoint.y - this.top);
            ctx.lineTo(endPoint.x - this.left, endPoint.y - this.top);

            /*
            dbgconsolelog("Drew segment from (relative) (" + (this.width === 1 ? 0 : (xMult * this.width / 2)) +
                "," + (this.height === 1 ? 0 : (yMult * this.height / 2)) + ") to (" +
                (this.width === 1 ? 0 : (xMult * -1 * this.width / 2)) + "," +
                (this.height === 1 ? 0 : (yMult * -1 * this.height / 2)) + ")");
*/
            //dbgconsolelog("Drawing segment from (" + topx + "," + topy + ") to (" + endPoint.x + "," + endPoint.y + ")");
            //dbgconsolelog("Drawing segment from (" + endPoint.x + "," + endPoint.y + ") to (" + botx + "," + boty + ")");
            //dbgconsolelog("This.left = "+this.left+", this.top = "+this.top);


            ctx.moveTo(topx - this.left, topy - this.top);
            ctx.lineTo(endPoint.x - this.left, endPoint.y - this.top);
            ctx.lineTo(botx - this.left, boty - this.top);
        }

        //ctx.beginPath();
        //ctx.moveTo(topx, topy);
        //ctx.lineTo(endPoint.x, endPoint.y);
        //ctx.lineTo(botx, boty);
        //ctx.strokeStyle = 'black';
        //ctx.lineWidth = 2;
        //ctx.stroke();
        //ctx.closePath();

        ctx.lineWidth = this.strokeWidth;

        // TODO: test this
        // make sure setting "fill" changes color of a line
        // (by copying fillStyle to strokeStyle, since line is stroked, not filled)
        var origStrokeStyle = ctx.strokeStyle;
        ctx.strokeStyle = this.stroke || ctx.fillStyle;
        this._renderStroke(ctx);
        ctx.strokeStyle = origStrokeStyle;

        if (this.labelText.length > 0) {
            var thetext = (this.secondaryText && this.secondaryText.length > 1) ? this.labelText+"*" : this.labelText;
            ctx.font = '10pt Arial';

            ctx.textAlign = 'center';
            var width = ctx.measureText(thetext).width + 2;
            var height = parseInt(ctx.font, 10) + 2;
            ctx.fillStyle = 'white';
            ctx.fillRect(-width / 2, -height + 2, width, height);


            ctx.fillStyle = 'black';
            ctx.fillText(thetext, 0, 0);
        }
        //});
    }
});

fabric.Pcarrow.fromObject = function(object) {
    return new fabric.Pcarrow(object);
};

fabric.Pcarrow.async = false;

/*fabric.Pchandle = fabric.util.createClass(fabric.Circle, {
    type: 'pchandle',
    initialize: function(options) {
        this.callSuper('initialize', options);
        options && this.set('parentShapeId', options.parentShapeId);
        options && this.set('position', options.position);
        options && this.set('opacityLocked', options.opacityLocked);
        options && this.set('hasControls', options.hasControls);
    },
    toObject: function() {
        return fabric.util.object.extend(this.callSuper('toObject'), {
            parentShapeId: this.parentShapeId,
            position: this.position,
            opacityLocked: this.opacityLocked,
            hasControls: this.hasControls
        });
    },
    _render: function(ctx) {
        this.callSuper('_render', ctx);
    }
});
fabric.Pchandle.fromObject = function(object) {
    return new fabric.Pchandle(obje`ct);
};
fabric.Pchandle.async = false;
*/
fabric.Pcgroup = fabric.util.createClass(fabric.Group, {
    type: 'pcgroup',

    initialize: function(options) {
        this.callSuper('initialize', options);
        options && this.set('inSidebar', options.inSidebar);
        options && this.set('groupId', options.groupId);
        options && this.set('hasControls', options.hasControls);
    },

    toObject: function() {
        return fabric.util.object.extend(this.callSuper('toObject'), {
            inSidebar: this.inSidebar,
            groupId: this.groupId
        });
    },

    _render: function(ctx) {
        this.callSuper('_render', ctx);
    }
});

fabric.Pcgroup.fromObject = function(object) {
    return new fabric.Pcgroup(object);
};

fabric.Pcgroup.async = false;

fabric.Pcarrowgroup = fabric.util.createClass(fabric.Group, {
    type: 'pcarrowgroup',

    initialize: function(options) {
        this.callSuper('initialize', options);
        options && this.set('inSidebar', options.inSidebar);
    },

    toObject: function() {
        return fabric.util.object.extend(this.callSuper('toObject'), {
            inSidebar: this.inSidebar
        });
    },

    _render: function(ctx) {
        this.callSuper('_render', ctx);
    }
});

fabric.Pcarrowgroup.fromObject = function(object) {
    return new fabric.Pcarrowgroup(object);
};

fabric.Pcarrowgroup.async = false;

function viewCanvasInit() {
    canvas.hoverCursor = 'pointer';
    var dragLeft = 0, dragTop = 0;
    var mouseDownDrag = false, mouseDown = false;

    canvas.on('mouse:down', function(ev) {
        //alert(ev.e.which);
        if (ev.e instanceof MouseEvent) {
            mouseDown = true;
            dragLeft = (ev.e.offsetX || ev.e.pageX - ev.e.target.offsetLeft);
            dragTop = (ev.e.offsetY || ev.e.pageY - ev.e.target.offsetTop);
        }
        else {
            mouseDown = true;
            dragLeft = ev.e.touches[0].pageX - ev.e.touches[0].target.offsetLeft;
            dragTop = ev.e.touches[0].pageY - ev.e.touches[0].target.offsetTop;
        }
    });

    canvas.on('mouse:move', function(ev) {
        var newLeft= 0, newTop = 0;
        mouseDownDrag = mouseDown;
        if (mouseDownDrag) {
            if (ev.e instanceof MouseEvent) {
                newLeft = (ev.e.offsetX || ev.e.pageX - ev.e.target.offsetLeft);
                newTop = (ev.e.offsetY || ev.e.pageY - ev.e.target.offsetTop);
                moveEverything(newLeft - dragLeft, newTop - dragTop);
                dragLeft = newLeft;
                dragTop = newTop;
            }
            else {
                newLeft = ev.e.touches[0].pageX - ev.e.touches[0].target.offsetLeft;
                newTop = ev.e.touches[0].pageY - ev.e.touches[0].target.offsetTop;
                moveEverything(newLeft - dragLeft, newTop - dragTop);
                dragLeft = newLeft;
                dragTop = newTop;
            }
        }
    });

    canvas.on('mouse:up', function(ev) {

        /*if (!mouseDownDrag && ev.e.which !== 3) {
           if (ev.target && !ev.target.inSidebar) {
                selectedShape = ev.target;
                if (isArrow(selectedShape)) {
                    var menustring = '#dropdown-arrow-' + selectedShape.arrowId;
                    dbgconsolelog("Triggering click for " + menustring +" a .showshapesecondary");
                    $(menustring+" a.showarrowsecondary").trigger("click");
                    highlightArrow(selectedShape);
                    found = true;
                } else if (isGroupContainingNonSidebarShape(selectedShape)) {
                    var menustring = '#dropdown-' + (getShapeFromGroup(selectedShape)).shapeId;
                    dbgconsolelog("Triggering click for " + menustring +" a .showshapesecondary");
                    $(menustring+" a.showshapesecondary").trigger("click");
                    found = true;
                } else if (isNonSidebarShape(selectedShape)) {
                    var menustring = '#dropdown-' + selectedShape.shapeId;
                    dbgconsolelog("Triggering click for " + menustring +" a .showshapesecondary");
                    $(menustring+" a.showshapesecondary").trigger("click");
                    highlightShape(selectedShape);
                    found = true;
                }
                if (canvasNav)
                    canvasNav.scrollToObject(selectedShape);
            }
            else {
                $("#extras-sidebar .close-panel-button").click();
            }
        }*/

        mouseDown = false;
        mouseDownDrag = false;
        dragLeft = 0;
        dragTop = 0;
    });
}

function addCanvasUI() {
    var splitlinex = 200;
    var splitlinewidth = 3;

    if ($('#new-canvas-wrapper, #edit-canvas-wrapper, #clone-canvas-wrapper').length) {

        /*var splitline = new fabric.Line([splitlinex, 0, splitlinex, ($('.work-section').height() - splitlinewidth)], {
            stroke: 'black',
            strokeWidth: splitlinewidth
        });
        splitline.selectable = false;
        splitline.inSidebar = true;
        canvas.add(splitline);*/

        //var uiBckg = new fabric.Rect( { left: (splitlinex/2), top: ($('.work-section').height()/2), width: splitlinex-1, height: $('.work-section').height()-1, fill: '#AAA', stroke: '#AAA', strokeWidth: 1 } );
        var uiBckg = new fabric.Rect( { left: (splitlinex/2), top: ($('.work-section').height()/2), width: splitlinex, height: $('.work-section').height(), fill: '#97A0AB' } );
        uiBckg.selectable = false;
        uiBckg.inSidebar = true;

        canvas.add(uiBckg);
        /*var rect = new fabric.Pcrect('https://s3.amazonaws.com/propchan-shapes/canvas-shape-1.png', {
            left: 0,
            top: 0,
            scaleX: 1,
            scaleY: 1,
            inSidebar: true,
            hasControls: false,
            labelText: "Start"
        });
        rect.on('image:loaded', function() {
            canvas.renderAll.bind(canvas);
            rect.set({
                left: 100,
                top: 100,
                hasControls: false,
                inSidebar: true
            });
            canvas.add(rect);
            canvas.calcOffset();
        });*/

        var circle = new fabric.Pccircle('https://s3.amazonaws.com/properchannel-shapes/canvas-shape-2.png', {
            left: 0,
            top: 0,
            scaleX: 1,
            scaleY: 1,
            inSidebar: true,
            hasControls: false,
            labelText: "Step"
        });

        circle.on('image:loaded', function() {
            canvas.renderAll.bind(canvas);
            /*var ch1 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 1,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: 0,
                left: circle.width / 2 + circRightOffset
            });
            var ch2 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 2,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: -(circle.height / 2) + circTopOffset,
                left: 0
            });
            var ch3 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 3,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: 0,
                left: -(circle.width / 2) + circLeftOffset
            });
            var ch4 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 4,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: circle.height / 2 + circBottomOffset,
                left: 0
            });
            var sidecircle = new fabric.Group([circle, ch1, ch2, ch3, ch4]);
            sidecircle.setLeft(100);
            sidecircle.setTop(250);
            sidecircle.hasControls = false;
            sidecircle.inSidebar = true;
            */

            circle.setLeft(100);
            circle.setTop(140);
            circle.hasControls = false;
            circle.inSidebar = true;

            canvas.add(circle);
            canvas.calcOffset();
        });

        var triangle = new fabric.Pctriangle('https://s3.amazonaws.com/properchannel-shapes/canvas-shape-3.png', {
            left: 0,
            top: 0,
            scaleX: 1,
            scaleY: 1,
            inSidebar: true,
            hasControls: false,
            labelText: "Decision"
        });

        triangle.on('image:loaded', function() {
            canvas.renderAll.bind(canvas)

            /*var th1 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 1,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: -triangle.height / 2 + triTopOffset,
                left: 0
            });
            var th2 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 2,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: triYOffset,
                left: triangle.width / 2 + triRightOffset
            });
            var th3 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 3,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: triYOffset,
                left: -triangle.width / 2 + triLeftOffset
            });
            var th4 = new fabric.Pchandle({
                radius: 4,
                stroke: 'black',
                fill: 'white',
                position: 4,
                opacity: 0,
                inSidebar: true,
                hasControls: false,
                top: triangle.height / 2 + triBottomOffset,
                left: 0
            });
            var sidetriangle = new fabric.Group([triangle, th1, th2, th3, th4]);
            sidetriangle.setLeft(100);
            sidetriangle.setTop(400);
            sidetriangle.hasControls = false;
            sidetriangle.inSidebar = true;
            */

            triangle.setLeft(100);
            triangle.setTop(240);
            triangle.hasControls = false;
            triangle.inSidebar = true;
            canvas.add(triangle);
            canvas.calcOffset();

        });
    }
}

function newCanvasInit() {
    var dragStartTop, dragStartLeft, dummySourceArrowTarget, dummyDestArrowTarget, siderect, sidecircle, sidetriangle;

    var splitlinex = 200;
    var splitlinewidth = 3;

    var rectLeftOffset = 4;
    var rectRightOffset = -4;
    var rectTopOffset = 0;
    var rectBottomOffset = -5;

    var circLeftOffset = 3;
    var circRightOffset = -3;
    var circTopOffset = 0;
    var circBottomOffset = -6;

    var triLeftOffset = 5;
    var triRightOffset = -5;
    var triTopOffset = 0;
    var triBottomOffset = -6;
    var triYOffset = -3;

    canvas = new fabric.Canvas('main-canvas');
    //updateCanvasSize($("#main-canvas").parents(".work-section").width(), $("#main-canvas").parents(".work-section").height());
    canvas.targetFindTolerance = 5;
    canvas.selection = false;
    canvas._currentSelection = null;

    $(document).on('click.canvasDeselect', function(e) {
        if ($(e.target).closest('canvas').length === 0) {
            canvas.deactivateAll();
            canvas.renderAll();
        }
    });

    /*$('#appview').on('dblclick', 'canvas', function(e) {
        var x,y;
        var xx = e.pageX;
        var yy = e.pageY;
        if(e.offsetX==undefined) {
            x = xx - $('#main-canvas').offset().left;
            y = yy - $('#main-canvas').offset().top;
        } else {
            x = e.offsetX;
            y = e.offsetY;
        }
        dbgconsolelog('Clicked canvas at ' + x + ", " + y);
        dbgconsolelog('Page coordinates: ' + xx + ", " + yy);
        //TODO - change behavior for lines
        var found = false;
        _.each(canvas._objects, function(o) {
            if (!found) {
                var w = o.width / 2;
                var h = o.height / 2;
                if (x >= (o.left - w) && x <= (o.left + w)) {
                    if (y >= (o.top - h) && y <= (o.top + h)) {
                        dbgconsolelog("clicked object " + o.toString());
                        if (!o.inSidebar) {
                            if (isArrow(o) && !(canvas.isTargetTransparent(o, x, y))) {
                                var menustring = '#dropdown-arrow-' + o.arrowId;
                                $("ul[id^='dropdown-']").css({
                                    display: 'none'
                                }).removeClass('open');
                                dbgconsolelog("Showing " + menustring);
                                $(menustring).attr('style', '')
                                    .css({
                                        display: 'block',
                                        position: 'absolute',
                                        left: xx,
                                        top: yy
                                    })
                                    .addClass('open');
                                $(menustring).on('click', 'a', function(e) {
                                    e.stopPropagation();
                                    menuHide(menustring);
                                });
                                //window.setTimeout(function() {
                                    $(document).on('click.hideShapeMenu', function() {
                                        menuHide(menustring);
                                    });
                                //}, 50);
                                found = true;
                            } else if (isGroupContainingNonSidebarShape(o)) {
                                var menustring = '#dropdown-' + (getShapeFromGroup(o)).shapeId;
                                $("ul[id^='dropdown-']").css({
                                    display: 'none'
                                }).removeClass('open');
                                dbgconsolelog("Showing " + menustring);
                                $(menustring).attr('style', '')
                                    .css({
                                        display: 'block',
                                        position: 'absolute',
                                        left: xx,
                                        top: yy
                                    })
                                    .addClass('open');
                                $(menustring).on('click', 'a', function(e) {
                                    e.stopPropagation();
                                    menuHide(menustring);
                                });
                                //window.setTimeout(function() {
                                    $(document).on('click.hideShapeMenu', function() {
                                        menuHide(menustring);
                                    });
                                //}, 500);
                                found = true;
                            } else if (isNonSidebarShape(o)) {
                                var menustring = '#dropdown-' + o.shapeId;
                                $("ul[id^='dropdown-']").css({
                                    display: 'none'
                                }).removeClass('open');
                                dbgconsolelog("Showing " + menustring);
                                $(menustring).attr('style', '')
                                    .css({
                                        display: 'block',
                                        position: 'absolute',
                                        left: xx,
                                        top: yy
                                    })
                                    .addClass('open');
                                $(menustring).on('click', 'a', function(e) {
                                    e.stopPropagation();
                                    menuHide(menustring);
                                });
                                //window.setTimeout(function() {
                                    $(document).on('click.hideShapeMenu', function() {
                                        menuHide(menustring);
                                    });
                                //}, 500);
                                found = true;
                            }
                        }
                    }
                }
            }
        });
    });*/

    if ($('#new-canvas-wrapper').length) {
        var startShape = new fabric.Pcrect('https://s3.amazonaws.com/properchannel-shapes/canvas-shape-1.png', {
            left: ((canvas.getWidth() - splitlinex) / 2) + splitlinex,
            top: 50,
            scaleX: 1,
            scaleY: 1,
            labelText: "Start"
        });

        startShape.inSidebar = false;
        startShape.shapeId = getNextObjID();
        startShape.follows = [];
        startShape.followedBy = [];
        startShape.arrowsIn = [];
        startShape.arrowsOut = [];

        startShape.on('image:loaded', function() {
            canvas.renderAll.bind(canvas);
            canvas.add(startShape);
            canvas.calcOffset();
        });

        shapecollection.create({
            id: startShape.shapeId,
            typename: startShape.get('type')
        });
    }

    canvas.findTarget = (function(originalFn) {
        return function() {
            var target = originalFn.apply(this, arguments);
            if (target) {
                if (this._hoveredTarget !== target) {
                    canvas.fire('object:over', {
                        target: target
                    });
                    if (this._hoveredTarget) {
                        canvas.fire('object:out', {
                            target: this._hoveredTarget
                        });
                    }
                    this._hoveredTarget = target;
                }
            } else if (this._hoveredTarget) {
                canvas.fire('object:out', {
                    target: this._hoveredTarget
                });
                this._hoveredTarget = null;
            }
            return target;
        };
    })(canvas.findTarget);

    canvas.on('object:over', function(e) {

        var nearest, oldnearest;

        dbgconsolelog(e.target.type);
        if (e.target instanceof fabric.Pcrect || e.target instanceof fabric.Pctriangle || e.target instanceof fabric.Pccircle) {
            e.target.oldColor = e.target.getFill();
            e.target.setFill('red');
            canvas.renderAll();
        }
        /*if (e.target instanceof fabric.Pcarrow) {
            console.log("Warning! arrow!");
        }*/
        if (e.target instanceof fabric.Group && currentTool == tools.connecttool && !(e.target.inSidebar)) {
            /*dbgconsolelog("Showing handles");
            e.target.forEachObject(function(obj) {
                if (obj instanceof fabric.Pchandle && !obj.opacityLocked) {
                    obj.setOpacity(0.75);
                }
            });*/

            canvas.on('mouse:move', function(options) {
                var mousePoint = canvas.getPointer(options.e);
                //dbgconsolelog("Mouse is at: (" + mousePoint.x + ", " + mousePoint.y + ")");
                //var nearest = getNearestHandle(mousePoint, e.target);

                //dbgconsolelog("The nearest handle to mouse @ (" + mousePoint.x + ", " + mousePoint.y + ") is " + JSON.stringify(nearest));
                if (tools.connecttool.started) {
                    if (e.target === dummySourceArrowTarget) {
                        return;
                    } else {
                        dummyDestArrowTarget = e.target;
                    }
                    dummyDestArrowTarget.forEachObject(function(obj) {
                        dbgconsolelog("This object of type " + obj.type + " is" + ((obj === nearest) ? " " : " not ") + "the nearest handle");
                        if (obj instanceof fabric.Pcarrow) {
                            dummyDestArrowTarget.removeWithUpdate(obj);
                        }
                        if (obj instanceof fabric.Pchandle && !obj.opacityLocked) {
                            if (obj === nearest) {
                                obj.setOpacity(1);
                            } else {
                                obj.setOpacity(0.75);
                            }
                        }
                        obj.set('active', false);
                    });

                    //var dummyHandleFrom = handleFrom;
                    //var dummyHandleTo = nearest;
                    var dummyStartPoint = startPoint;
                    var toCtr = e.target.getCenterPoint();
                    dummyEndPoint = new fabric.Point(options.target.left + toCtr.x, options.target.top + toCtr.y);

                    dbgconsolelog("Drawing dummy arrow from: " + dummyStartPoint + " to " + dummyEndPoint);

                    dummyArrow = new fabric.Pcarrow([dummyStartPoint.x, dummyStartPoint.y, dummyEndPoint.x, dummyEndPoint.y]);
                    dummyArrow.set({
                        stroke: '#555',
                        strokeWidth: 2,
                        hasControls: false,
                        labelText: "",
                        opacity: 0.6
                    });

                    dummyDestArrowTarget.addWithUpdate(dummyArrow);

                    //canvas.add(dummyArrow);

                    dummyDestArrowTarget.set({
                        hasControls: false
                    })

                    dummyDestArrowTarget.forEachObject(function(o) {
                        o.set({
                            hasControls: false,
                            active: false
                        })
                    })

                    dbgconsolelog("This is the end");

                    canvas.deactivateAllWithDispatch();


                    canvas.deactivateAll().renderAll();

                } else {
                    dummySourceArrowTarget = e.target;
                    e.target.forEachObject(function(obj) {
                        //dbgconsolelog("This object of type " + obj.type + " is" + ((obj === nearest) ? " " : " not ") + "the nearest handle");
                        if (obj instanceof fabric.Pchandle && !obj.opacityLocked) {
                            if (obj === nearest) {
                                obj.setOpacity(1);
                            } else {
                                obj.setOpacity(0.75);
                            }
                        }
                    });
                    dbgconsolelog("This is the beginning");
                    canvas.renderAll();
                }
            });
            canvas.deactivateAll().renderAll();
        }
    });

    canvas.on('object:selected', function(e) {
        if(canvas._currentSelection !== e.target && isGroupContainingNonSidebarShape(canvas._currentSelection)) {
            dbgconsolelog("Change color");
        }
        if(canvas._currentSelection !== e.target && canvas._currentSelection instanceof fabric.Pcarrow) {
            canvas._currentSelection.set({strokeWidth: 2});
        }

        if(e.target instanceof fabric.Pcarrow) {
            e.target.set({strokeWidth: 5});
        }

        canvas._currentSelection = e.target;
    });

    canvas.on('selection:cleared', function(e) {
        resetArrowWidths();
        canvas._currentSelection = null;
    });

    canvas.on('object:out', function(e) {
        canvas.off('mouse:move');
        if (e.target instanceof fabric.Pcrect || e.target instanceof fabric.Pctriangle || e.target instanceof fabric.Pccircle) {
            e.target.setFill(e.target.oldColor);
            canvas.renderAll();
        }
        if (e.target instanceof fabric.Group && currentTool == tools.connecttool && !(e.target.inSidebar)) {
            if (dummyArrow && !(e.target === dummySourceArrowTarget)) {
                dummyDestArrowTarget.removeWithUpdate(dummyArrow);
                dummyDestArrowTarget.set({
                    hasControls: false,
                    active: false
                })
                canvas.renderAll();
            }
            e.target.forEachObject(function(obj) {
                if (obj instanceof fabric.Pchandle && !obj.opacityLocked) {
                    obj.setOpacity(0);
                }
                obj.set({
                    hasControls: false,
                    active: false
                })
            });
            canvas.deactivateAll().renderAll();
        }
    });

    canvas.on('mouse:down', function(e) {
        if (e.target && (isShape(e.target))) {
            dragStartLeft = e.target.left;
            dragStartTop = e.target.top;
            dbgconsolelog('Clicked object at top: ' + dragStartTop + ', left: ' + dragStartLeft);
        }
    });

    canvas.on('object:modified', function(e) {
        var allowedMove = true;

        //Prevent objects from leaving canvas. Objects now allowed to overlap

        var activeObject = e.target;
        if ((activeObject.get('left') - (activeObject.get('width') * activeObject.get('scaleX') / 2) < 200)) {
            allowedMove = false;
        }
        if ((activeObject.get('top') - (activeObject.get('height') * activeObject.get('scaleY') / 2) < 0)) {
            allowedMove = false;
        }
        if (activeObject.get('left') + (activeObject.get('width') * activeObject.get('scaleX') / 2) > canvas.getWidth()) {
            allowedMove = false;
        }
        if (activeObject.get('top') + (activeObject.get('height') * activeObject.get('scaleY') / 2) > canvas.getHeight()) {
            allowedMove = false;
        }
        /*
        canvas.forEachObject(function(obj) {
            if (obj === e.target) return;
            if (obj instanceof fabric.Pcarrow) {
                thearrow = obj;
                theshape = e.target instanceof fabric.Group ? getShapeFromGroup(e.target) : e.target;
                var toIgnore = false;
                if (_.contains([thearrow.toShape, thearrow.fromShape], theshape.shapeId)) {
                    toIgnore = true;
                }
                //dbgconsolelog("Shape points: " + theshape.points);
                if (!toIgnore && myArrowIntersectsWith(thearrow, theshape)) {
                    allowedMove = false;
                }
            } else if (isGroupContainingArrow(obj)) {
                thearrow = getArrowFromGroup(obj);
                theshape = e.target instanceof fabric.Group ? getShapeFromGroup(e.target) : e.target;
                //dbgconsolelog("Shape points: " + theshape.points);
                if (myArrowIntersectsWith(thearrow, theshape)) {
                    allowedMove = false;
                }
            } else if (e.target.intersectsWithObject(obj)) {
                allowedMove = false;
            };
        });
*/

        dbgconsolelog("Move is" + (allowedMove ? " " : " not ") + "allowed");

        if (!allowedMove) {
            //dbgconsolelog("Animating " + activeObject.toString() + "back to original position at top: " + dragStartTop + ", left: " + dragStartLeft);
            e.target.animate('top', dragStartTop, {
                onChange: function() {
                    canvas.trigger('object:moving', {
                        target: e.target
                    });
                    canvas.renderAll();
                    resetOpacity();
                }
            });
            e.target.animate('left', dragStartLeft, {
                onChange: function() {
                    canvas.trigger('object:moving', {
                        target: e.target
                    });
                    canvas.renderAll();
                }
            });

        }

        if (allowedMove && e.target.inSidebar) {
            var innerShape;
            var isrect = false;
            var iscirc = false;
            var istri = false;

            dbgconsolelog("Need to replace sidebar shape...");

            if (e.target instanceof fabric.Pcrect) {
                dbgconsolelog("Found rect!")
                isrect = true;
                e.target.set({labelText:""});
            }
            if (e.target instanceof fabric.Pccircle) {
                dbgconsolelog("Found circle!")
                iscirc = true;
                e.target.set({labelText:""});
            }
            if (e.target instanceof fabric.Pctriangle) {
                dbgconsolelog("Found triangle!")
                istri = true;
                e.target.set({labelText:""});
            }

            if (e.target instanceof fabric.Group) {
                e.target.forEachObject(function(obj) {
                    if (obj instanceof fabric.Pcrect) {
                        dbgconsolelog("Found rect!")
                        isrect = true;
                        obj.set({labelText:""});
                    }
                    if (obj instanceof fabric.Pccircle) {
                        dbgconsolelog("Found circle!")
                        iscirc = true;
                        obj.set({labelText:""});
                    }
                    if (obj instanceof fabric.Pctriangle) {
                        dbgconsolelog("Found triangle!")
                        istri = true;
                        obj.set({labelText:""});
                    }
                })
            }

            /*if (isrect) {
                dbgconsolelog("Replacing rect!");
                var newrect = new fabric.Pcrect('https://s3.amazonaws.com/propchan-shapes/canvas-shape-1.png', {
                    left: 0,
                    top: 0,
                    scaleX: 1,
                    scaleY: 1,
                    inSidebar: true,
                    hasControls: false,
                    labelText: "Start"
                });
                newrect.on('image:loaded', function() {
                    canvas.renderAll.bind(canvas);
                    newrect.set({
                        left: 100,
                        top: 100,
                        hasControls: false,
                        inSidebar: true
                    })
                    canvas.add(newrect);
                    canvas.calcOffset();
                });
                //e.target.groupId = getNextGroupID();
                //innerShape = getShapeFromGroup(e.target);
                innerShape = e.target;
                dbgconsolelog(innerShape);
                e.target.inSidebar = false;
                innerShape.inSidebar = false;
                innerShape.shapeId = getNextObjID();
                innerShape.follows = [];
                innerShape.followedBy = [];
                innerShape.arrowsIn = [];
                innerShape.arrowsOut = [];
            } else*/ if (iscirc) {
                dbgconsolelog("Replacing circle!");
                var newcircle = new fabric.Pccircle('https://s3.amazonaws.com/properchannel-shapes/canvas-shape-2.png', {
                    left: 0,
                    top: 0,
                    scaleX: 1,
                    scaleY: 1,
                    inSidebar: true,
                    hasControls: false,
                    labelText: "Step"
                });

                newcircle.on('image:loaded', function() {
                    canvas.renderAll.bind(canvas);

                    newcircle.setLeft(100);
                    newcircle.setTop(140);
                    newcircle.hasControls = false;
                    newcircle.inSidebar = true;

                    canvas.add(newcircle);
                    canvas.calcOffset();
                });

                //e.target.groupId = getNextGroupID();

                //innerShape = getShapeFromGroup(e.target);
                innerShape = e.target;
                dbgconsolelog(innerShape);
                e.target.inSidebar = false;
                innerShape.inSidebar = false;
                innerShape.shapeId = getNextObjID();
                innerShape.follows = [];
                innerShape.followedBy = [];
                innerShape.arrowsIn = [];
                innerShape.arrowsOut = [];

            } else if (istri) {
                dbgconsolelog("Replacing triangle!");
                var newtriangle = new fabric.Pctriangle('https://s3.amazonaws.com/properchannel-shapes/canvas-shape-3.png', {
                    left: 0,
                    top: 0,
                    scaleX: 1,
                    scaleY: 1,
                    inSidebar: true,
                    hasControls: false,
                    labelText: "Decision"
                });

                newtriangle.on('image:loaded', function() {
                    canvas.renderAll.bind(canvas);

                    newtriangle.setLeft(100);
                    newtriangle.setTop(240);
                    newtriangle.hasControls = false;
                    newtriangle.inSidebar = true;
                    canvas.add(newtriangle);
                    canvas.calcOffset();
                });

                //e.target.groupId = getNextGroupID();

                //innerShape = getShapeFromGroup(e.target);
                innerShape = e.target;
                dbgconsolelog(innerShape);
                e.target.inSidebar = false;
                innerShape.inSidebar = false;
                innerShape.shapeId = getNextObjID();
                innerShape.follows = [];
                innerShape.followedBy = [];
                innerShape.arrowsIn = [];
                innerShape.arrowsOut = [];


            }
            var thetype = innerShape.get('type');
            dbgconsolelog('thetype is: ' + thetype);

            shapecollection.create({
                id: innerShape.shapeId,
                typename: thetype
            });
            /*
            var smv = new App.ShapeMenuView({
                el: '#appview',
                model: bbShape
            });

else if(e.target instanceof fabric.Pctriangle) {
    var newtri = new fabric.Pctriangle({
        width: 100, height: 100, left: 100, top: 400, fill: 'purple', hasControls: false, inSidebar: true, labelText: ""
    });
    e.target.inSidebar = false;
    e.target.shapeId = getNextObjID();
    e.target.follows = [];
    e.target.followedBy = [];
    canvas.add(newtri);
}*/
        }
    })

    canvas.on({
        'object:moving': onChange,
        'object:scaling': onChange,
        'object:rotating': onChange
    });

    function onChange(options) {
        var pt = options.target;
        options.target.setCoords();
        canvas.forEachObject(function(obj) {
            /*if (obj === options.target || obj instanceof fabric.Pcarrow || options.target instanceof fabric.Pcarrow || obj instanceof fabric.Pchandle) return;
            if (obj instanceof fabric.Group) {
                obj.forEachObject(function(o) {
                    if (isShape(o)) {
                        o.setOpacity(options.target.intersectsWithObject(obj) ? 0.5 : 1);
                    }
                })
            }*/
            if (isNonSidebarShape(pt)) {
                var movingShape = pt;
                //dbgconsolelog(movingShape.type + " with ID " + movingShape.shapeId + " is moving...");
                _.each(movingShape.arrowsIn, function(arrow) {
                    var thisIncoming = getArrowByID(arrow);
                    dbgconsolelog("Incoming arrow: " + arrow);
                    var newEndPoint = pt.getCenterPoint();
                    dbgconsolelog("Line from (" + thisIncoming.x1 + "," + thisIncoming.y1 + ") to (" + thisIncoming.x2 + "," + thisIncoming.y2 + ")");
                    dbgconsolelog("Changing to (" + thisIncoming.x1 + "," + thisIncoming.y1 + ") - (" + newEndPoint.x + "," + newEndPoint.y + ")");
                    thisIncoming && thisIncoming.set({
                        'x2': newEndPoint.x,
                        'y2': newEndPoint.y
                    });
                    options.target.setCoords();
                    thisIncoming.setCoords();
                    //thisIncoming.x2 = newEndPoint.x + pt.left;
                    //thisIncoming.y2 = newEndPoint.y + pt.top;
                    canvas.renderAll();
                });
                _.each(movingShape.arrowsOut, function(arrow) {
                    var thisOutgoing = getArrowByID(arrow);
                    dbgconsolelog("Outgoing arrow: " + arrow);
                    var newStartPoint = pt.getCenterPoint();
                    dbgconsolelog("Line from (" + thisOutgoing.x1 + "," + thisOutgoing.y1 + ") to (" + thisOutgoing.x2 + "," + thisOutgoing.y2 + ")");
                    dbgconsolelog("Changing to (" + newStartPoint.x + "," + newStartPoint.y + ") - (" + thisOutgoing.x2 + "," + thisOutgoing.y2 + ")");
                    thisOutgoing && thisOutgoing.set({
                        'x1': newStartPoint.x,
                        'y1': newStartPoint.y
                    });
                    options.target.setCoords();
                    thisOutgoing.setCoords();
                    //thisIncoming.x2 = newEndPoint.x + pt.left;
                    //thisIncoming.y2 = newEndPoint.y + pt.top;
                    canvas.renderAll();
                });
            }
        });
    }

}

function cleanUpCanvas() {
    canvas = null;
    $(document).off('click.canvasDeselect');
    $('.chart-action, .tag-edit').tooltip('destroy');
}

function isPcrectGroup(e) {
    var found = false;
    if (e instanceof fabric.Group) {
        //dbgconsolelog("Check for rect");
        e.forEachObject(function(obj) {
            if (obj instanceof fabric.Pcrect) {
                found = true;
            }
        })
    }
    return found;
}

function isPctriangleGroup(e) {
    var found = false;
    if (e instanceof fabric.Group) {
        //dbgconsolelog("Check for tri");
        e.forEachObject(function(obj) {
            if (obj instanceof fabric.Pctriangle) {
                found = true;
            }
        })
    }
    return found;
}

function isPccircleGroup(e) {
    var found = false;
    if (e instanceof fabric.Group) {
        //dbgconsolelog("Check for circ");
        e.forEachObject(function(obj) {
            if (obj instanceof fabric.Pccircle) {
                found = true;
            }
        })
    }
    return found;
}

function isShapeGroup(e) {
    return (isPcrectGroup(e) || isPctriangleGroup(e) || isPccircleGroup(e));
}

function resetOpacity() {
    canvas.forEachObject(function(obj) {
        //dbgconsolelog(obj.type);
        if (obj instanceof fabric.Pcgroup || obj instanceof fabric.Group) {
            obj.forEachObject(function(gobj) {
                if (!(gobj instanceof fabric.Pchandle)) {
                    gobj.setOpacity(1);
                } else if (!obj.opacityLocked) {
                    obj.setOpacity(0);
                }
            })
        } else {
            obj.setOpacity(1);
        }
    });
}

function getNextObjID() {
    var max = 1;
    var thisId;
    canvas.forEachObject(function(obj) {
        if (isShape(obj)) {
            dbgconsolelog("Found shape with ID " + obj.shapeId);
            thisId = obj.shapeId;
        } else if (obj instanceof fabric.Pcgroup || obj instanceof fabric.Group) {
            dbgconsolelog("Found a group");
            obj.forEachObject(function(gobj) {
                if (gobj.shapeId && gobj.shapeId >= max) {
                    dbgconsolelog("Obj contains group with shapeId " + gobj.shapeId);
                    thisId = gobj.shapeId;
                }
            });
        }

        if (thisId >= max) {
            max = thisId + 1;
        }
    })
    dbgconsolelog("Next ID should be " + max);
    return max;
}

function getNextArrowID() {
    var max = 1;
    var thisId;
    canvas.forEachObject(function(obj) {
        if (isArrow(obj)) {
            dbgconsolelog("Found arrow with ID " + obj.arrowId);
            thisId = obj.arrowId;
        } else if (obj instanceof fabric.Pcgroup || obj instanceof fabric.Group) {
            dbgconsolelog("Found a group");
            obj.forEachObject(function(gobj) {
                if (gobj.arrowId && gobj.arrowId >= max) {
                    dbgconsolelog("Obj contains group with arrowId " + gobj.arrowId);
                    thisId = gobj.arrowId;
                }
            });
        }

        if (thisId >= max) {
            max = thisId + 1;
        }
    })
    dbgconsolelog("Next ID should be " + max);
    return max;
}

function getNextGroupID() {
    var max = 1;
    canvas.forEachObject(function(obj) {
        var thisId = obj.groupId;
        if (thisId >= max) {
            max = thisId + 1;
        }
    })
    return max;
}

function getShapeByID(id) {
    var retVal, found = false;
    allObjects = canvas.getObjects();
    /*allGroups = _.where(allObjects, {
        type: 'group'
    });
    for (var i = 0; i < allObjects.length; i++) {
        thisGroup = allGroups[i];
        thisGroup.forEachObject(function(obj) {
            if (obj.shapeId == id) {
                found = true;
                retVal = obj;
            }
        });
    }*/

    _.each(allObjects, function(obj) {
            if (obj.shapeId == id) {
                found = true;
                retVal = obj;
            }
        });

    if (found) {
        return retVal;
    } else {
        return false;
    }
    //return _.findWhere(allObjects, {shapeId: id});
}

function getArrowByID(id) {
    var retVal, found = false;
    allObjects = canvas.getObjects();
    _.each(allObjects, function(obj) {
        if (obj.arrowId == id) {
            found = true;
            retVal = obj;
        }
    });
    allGroups = _.where(allObjects, {
        type: 'group'
    });
    for (var i = 0; i < allGroups.length; i++) {
        thisGroup = allGroups[i];
        thisGroup.forEachObject(function(obj) {
            if (obj.arrowId == id) {
                found = true;
                retVal = obj;
            }
        });
    }
    if (found) {
        return retVal;
    } else {
        dbgconsolelog("Not found!");
        return false;
    }
    //return _.findWhere(allObjects, {arrowId: id});
}

function getGroupContainingArrow(id) {
    var retVal, found = false;
    allObjects = canvas.getObjects();
    allGroups = _.where(allObjects, {
        type: 'group'
    });
    for (var i = 0; i < allGroups.length; i++) {
        thisGroup = allGroups[i];
        thisGroup.forEachObject(function(obj) {
            if (obj.arrowId == id) {
                found = true;
                retVal = thisGroup;
            }
        });
    }
    if (found) {
        return retVal;
    } else {
        return false;
    }
}

function getArrowByShapes(fromShapeId, toShapeId) {
    var retVal, found = false;
    allObjects = canvas.getObjects();
    allGroups = _.where(allObjects, {
        type: 'group'
    });
    dbgconsolelog("Searching for arrow connecting " + fromShapeId + " to " + toShapeId);
    _.each(allObjects, function(obj) {
        if (obj instanceof fabric.Pcarrow && obj.fromShape == fromShapeId && obj.toShape == toShapeId) {
            found = true;
            dbgconsolelog("Found arrow with ID " + obj.arrowId);
            retVal = obj;
        }
    });
    for (var i = 0; i < allGroups.length; i++) {
        thisGroup = allGroups[i];
        thisGroup.forEachObject(function(obj) {
            if (obj instanceof fabric.Pcarrow && obj.fromShape == fromShapeId && obj.toShape == toShapeId) {
                found = true;
                dbgconsolelog("Found arrow with ID " + obj.arrowId);
                retVal = obj;
            }
        });
    }
    if (found) {
        return retVal;
    } else {
        return false;
    }
    //return _.findWhere(allObjects, {fromShape: fromShapeId, toShape: toShapeId});
}

function getShapeFromGroup(g) {
    if (!(g instanceof fabric.Group)) {
        if (isShape(g)) {
            return g;
        }
        else {
            return false;
        }
    }

    var retVal = false;

    g.forEachObject(function(obj) {
        if (isShape(obj)) {
            retVal = obj;
        }
    });

    return retVal;
}

function getGroupContainingShape(id) {
    var returnGroup, found = false;
    allObjects = canvas.getObjects();
    allGroups = _.where(allObjects, {
        type: 'group'
    });
    for (var i = 0; i < allGroups.length; i++) {
        thisGroup = allGroups[i];
        thisGroup.forEachObject(function(obj) {
            //dbgconsolelog(obj.shapeId);
            if (obj.shapeId == id) {
                found = true;
                returnGroup = thisGroup;
            }
        });
    }
    if (found) {
        return returnGroup;
    } else {
        return false;
    }
}

function getArrowFromGroup(g) {
    if (!(g instanceof fabric.Group)) {
        return false;
    }

    var retVal = false;
    g.forEachObject(function(obj) {
        if (isArrow(obj)) {
            retVal = obj;
        }
    });

    return retVal;
}

function getHandleByShapeGroupAndID(shapegroup, handid) {
    var result = false;
    shapegroup.forEachObject(function(obj) {
        if (obj instanceof fabric.Pchandle && obj.position == handid) {
            result = obj;
        }
    });

    if (!result) {
        dbgconsolelog("Could not find specified handle!");
    }
    return result;
}

function printConnections() {
    allobjs = canvas.getObjects();
    _.each(allobjs, function(o) {
        if(isNonSidebarShape(o)) {
            console.log("Shape ID: " + o.get('shapeId') + ", follows: " + o.get('follows') + ", followedBy: "+o.get('followedBy') + ", arrowsIn: "+o.get('arrowsIn') + ", arrowsOut: "+o.get('arrowsOut'));
        } else if (isArrow(o)) {
            console.log("Arrow ID: " + o.get('arrowId') + ", fromShape: " + o.get('fromShape') + ", toShape: "+o.get('toShape'));
        }
    })
}

function checkConsistency() {
    var allobjs = canvas.getObjects();
    var arrows = [];
    var nsshapes = [];
    var errors = [];
    _.each(allobjs, function(o) {
        if(isArrow(o)) {
            arrows.push(o);
        } else if(isNonSidebarShape(o)) {
            nsshapes.push(o);
        }
    });
    _.each(arrows, function(a) {
        var thisID = a.get('arrowId');
        var fromShape = getShapeByID(a.get('fromShape'));
        var toShape = getShapeByID(a.get('toShape'));
        var fromShapeOutgoingFiltered = _.filter(fromShape.get('arrowsOut'), function(num) {return num == thisID;});
        var toShapeIncomingFiltered = _.filter(toShape.get('arrowsIn'), function(num) {return num == thisID;});
        var fromShapeFollowedByFiltered = _.filter(fromShape.get('followedBy'), function(num) {return num == toShape.get('shapeId')});
        console.log(fromShapeFollowedByFiltered);
        var toShapeFollowsFiltered = _.filter(toShape.get('follows'), function(num) {return num == fromShape.get('shapeId')});
        console.log(toShapeFollowsFiltered);
        if(!fromShapeOutgoingFiltered.length == 1) {
            errors.push("Arrow "+thisID+" is from shape "+fromShape.get('shapeId')+" but that shape's outgoing arrows are: "+fromShape.get('arrowsOut'));
        }
        if(!toShapeIncomingFiltered.length == 1) {
            errors.push("Arrow "+thisID+" is to shape "+toShape.get('shapeId')+" but that shape's incoming arrows are: "+toShape.get('arrowsIn'));
        }
        if(!fromShapeFollowedByFiltered.length == 1) {
            errors.push("Arrow "+thisID+" is from shape "+fromShape.get('shapeId')+" but that shape declares followed by: "+fromShape.get('followedBy'));
        }
        if(!toShapeFollowsFiltered.length == 1) {
            errors.push("Arrow "+thisID+" is to shape "+toShape.get('shapeId')+" but that shape declares follows: "+toShape.get('follows'));
        }
    });
    _.each(nsshapes, function(s) {
        var thisID = s.get('shapeId');
        var arrowsOut = s.get('arrowsOut');
        var arrowsIn = s.get('arrowsIn');
        _.each(arrowsOut, function(a) {
            var thearrow = getArrowByID(a);
            if(!(thearrow.fromShape == thisID)) {
                errors.push("Shape "+thisID+" declares arrowOut "+a+" but that arrow's fromShape is "+thearrow.fromShape);
            }
        });
        _.each(arrowsIn, function(a) {
            var thearrow = getArrowByID(a);
            if(!(thearrow.toShape == thisID)) {
                errors.push("Shape "+thisID+" declares arrowIn "+a+" but that arrow's toShape is "+thearrow.fromShape);
            }
        });
    });

    if(errors.length > 0) {
        _.each(errors, function(e) {
            console.log(e);
        })
    } else {
        console.log("No errors found");
    }
}

function deleteShape(shapeToDelete) {
    var innerShapeToDelete = shapeToDelete instanceof fabric.Group ? getShapeFromGroup(shapeToDelete) : shapeToDelete;
    var prevShape, newFollowedBy, nextShape, newFollows;
    dbgconsolelog("Deleting object " + innerShapeToDelete.type + " with ID " + innerShapeToDelete.shapeId);

    //for each shape preceding this, remove the incoming arrow and set follows/followedby accordingly
    _.each(innerShapeToDelete.follows, function(obj) {
        dbgconsolelog("Deleting connection from object " + obj + " to object " + innerShapeToDelete.shapeId);
        prevShape = getShapeByID(obj);
        arrowToRemove = getArrowByShapes(obj, innerShapeToDelete.shapeId);
        if(!arrowToRemove) {
            dbgconsolelog("Warning - arrowToRemove not found")
        } else {
            //canvas.remove(getGroupContainingArrow(arrowToRemove.arrowId));
            dbgconsolelog("Deleting arrow with id " + arrowToRemove.arrowId);
            var newArrowsOut = _.without(prevShape.arrowsOut, arrowToRemove.arrowId);
            var newArrowsIn = _.without(innerShapeToDelete.arrowsIn, arrowToRemove.arrowId);
            dbgconsolelog("Changing outgoing arrows from " + prevShape.arrowsOut + " to " + newArrowsOut, ", removing "+arrowToRemove.arrowId);
            prevShape.set({
                arrowsOut: newArrowsOut
            });
            dbgconsolelog("Changing incoming arrows from " + innerShapeToDelete.arrowsIn + " to " + newArrowsIn, ", removing "+arrowToRemove.arrowId);
            innerShapeToDelete.set({
                arrowsIn: newArrowsIn
            });
            arrowcollection.get(arrowToRemove.arrowId).destroy();
            canvas.remove(arrowToRemove);
        }

        newFollowedBy = _.without(prevShape.followedBy, innerShapeToDelete.shapeId);
        dbgconsolelog("Changing ID " + obj + "'s children from " + prevShape.followedBy + " to " + newFollowedBy);
        prevShape.set({
            followedBy: newFollowedBy
        });
        newFollows = _.without(innerShapeToDelete.follows, prevShape.shapeId);
        dbgconsolelog("Changing ID " + innerShapeToDelete.shapeId + "'s parents from " + innerShapeToDelete.follows + " to " + newFollows);
        innerShapeToDelete.set({
            follows: newFollows
        });
        /*var fromGroup = getGroupContainingShape(obj);
        fromGroup.forEachObject(function(obj) {
            if (obj instanceof fabric.Pchandle) {
                obj.setOpacity(0);
                obj.opacityLocked = false;
            }
        });*/
    });
    _.each(innerShapeToDelete.followedBy, function(obj) {
        dbgconsolelog("Deleting connection from object " + innerShapeToDelete.shapeId + " to object " + obj);
        nextShape = getShapeByID(obj);
        arrowToRemove = getArrowByShapes(innerShapeToDelete.shapeId, obj);
        if(!arrowToRemove) {
            dbgconsolelog("Warning - arrowToRemove not found")
        } else {
            //canvas.remove(getGroupContainingArrow(arrowToRemove.arrowId));
            newArrowsIn = _.without(nextShape.arrowsIn, arrowToRemove.arrowId);
            dbgconsolelog("Changing incoming arrows from " + nextShape.arrowsIn + " to " + newArrowsIn + ", removing "+arrowToRemove.arrowId);
            nextShape.set({
                arrowsIn: newArrowsIn
            });
            newArrowsOut = _.without(innerShapeToDelete.arrowsOut, arrowToRemove.arrowId);
            dbgconsolelog("Changing outgoing arrows from " + innerShapeToDelete.arrowsOut + " to " + newArrowsOut+ ", removing "+arrowToRemove.arrowId);
            innerShapeToDelete.set({
                arrowsOut: newArrowsOut
            });
            arrowcollection.get(arrowToRemove.arrowId).destroy();
            canvas.remove(arrowToRemove);
        }

        newFollows = _.without(nextShape.follows, innerShapeToDelete.shapeId);
        dbgconsolelog("Changing ID " + obj + "'s parents from " + nextShape.follows + " to " + newFollows);
        nextShape.set({
            follows: newFollows
        });
        newFollowedBy = _.without(innerShapeToDelete.followedBy, nextShape.shapeId);
        dbgconsolelog("Changing ID " + innerShapeToDelete.shapeId + "'s children from " + innerShapeToDelete.followedBy + " to " + newFollowedBy);
        innerShapeToDelete.set({
            followedBy: newFollowedBy
        });
        /*var toGroup = getGroupContainingShape(obj);
        toGroup.forEachObject(function(obj) {
            if (obj instanceof fabric.Pchandle) {
                obj.setOpacity(0);
                obj.opacityLocked = false;
            }
        });*/
    });

    /*shGroupToDelete = shapeToDelete instanceof fabric.Group ? shapeToDelete : getGroupContainingShape(shapeToDelete.shapeId);
    if(canvas._currentSelection === shapeToDelete || canvas._currentSelection === shGroupToDelete) {
        canvas._currentSelection = null;
    }
    canvas.remove(shGroupToDelete);*/
    if(canvas._currentSelection === shapeToDelete) {
        canvas._currentSelection = null;
    }
    canvas.remove(shapeToDelete);
}

function deleteArrow(arrowToDelete) {
    //TODO -- fix handle behavior when > 1 arrow attached -- should not delete connection b/w shapes if there is another arrow connecting!

    var innerArrowToDelete = arrowToDelete instanceof fabric.Pcarrow ? arrowToDelete : getArrowFromGroup(arrowToDelete);
    dbgconsolelog("Deleting arrow with ID " + innerArrowToDelete.arrowId);


    var shapeFrom = getShapeByID(innerArrowToDelete.fromShape),
        shapeTo = getShapeByID(innerArrowToDelete.toShape);

    dbgconsolelog("(before) shapeFrom arrowsOut is now: ");
    dbgconsolelog(shapeFrom.arrowsOut);
    dbgconsolelog("(before) shapeTo arrowsIn is now: ");
    dbgconsolelog(shapeTo.arrowsIn);

    newArrowsOut = _.without(shapeFrom.arrowsOut, innerArrowToDelete.arrowId);

    shapeFrom.set({
        arrowsOut: newArrowsOut
    });

    newArrowsIn = _.without(shapeTo.arrowsIn, innerArrowToDelete.arrowId)

    shapeTo.set({
        arrowsIn: newArrowsIn
    });

    dbgconsolelog("(after) shapeFrom arrowsOut is now: ");
    dbgconsolelog(shapeFrom.arrowsOut);
    dbgconsolelog("(after) shapeTo arrowsIn is now: ");
    dbgconsolelog(shapeTo.arrowsIn);

    if(shouldRemoveConnection(shapeFrom, shapeTo, innerArrowToDelete)) {
        dbgconsolelog("Removing connection from shape " + innerArrowToDelete.fromShape + " to shape " + innerArrowToDelete.toShape);
        dbgconsolelog("(before) shapeFrom followedBy is now: ");
        dbgconsolelog(shapeFrom.followedBy);
        dbgconsolelog("(before) shapeTo follows is now: ");
        dbgconsolelog(shapeTo.follows);
        dbgconsolelog("Removing "+innerArrowToDelete.toShape+" from "+shapeFrom.followedBy+"...");
        newFollowedBy = _.without(shapeFrom.followedBy, innerArrowToDelete.toShape);
        dbgconsolelog("...gives "+newFollowedBy);
        shapeFrom.set({
            followedBy: newFollowedBy
        });
        dbgconsolelog("Removing "+innerArrowToDelete.fromShape+" from "+shapeTo.follows+"...");
        newFollows = _.without(shapeTo.follows, innerArrowToDelete.fromShape);
        dbgconsolelog("...gives "+newFollows);
        shapeTo.set({
            follows: newFollows
        });
        dbgconsolelog("(after) shapeFrom followedBy is now: ");
        dbgconsolelog(shapeFrom.followedBy);
        dbgconsolelog("(after) shapeTo follows is now: ");
        dbgconsolelog(shapeTo.follows);
    }
    /*fromGroup = getGroupContainingShape(innerArrowToDelete.fromShape);
    dbgconsolelog(fromGroup);
    toGroup = getGroupContainingShape(innerArrowToDelete.toShape);
    dbgconsolelog(toGroup);
    //var deleteFromHandle = arrowToDelete.fromHandle;
    //var deleteToHandle = arrowToDelete.toHandle;
    fromGroup.forEachObject(function(obj) {
        if (obj instanceof fabric.Pchandle) {
            obj.setOpacity(0);
            obj.opacityLocked = false;
            if obj.position === deleteFromHandle {
                //this was the from handle for the arrow we are deleting
            }
        }
    });
    toGroup.forEachObject(function(obj) {
        if (obj instanceof fabric.Pchandle) {
            obj.setOpacity(0);
            obj.opacityLocked = false;
            if obj.position === deleteToHandle {
                //this was the to handle for the arrow we are deleting
            }
        }
    });*/

    if(canvas._currentSelection === innerArrowToDelete) {
        canvas._currentSelection = null;
    }

    canvas.remove(innerArrowToDelete);
    resetOpacity();
}

/**
 * Checks whether this connection between shapes should be removed. This should happen iff the arrow being deleted is the only connection between the two shapes
 * @param {Shape} fromShape - the shape from which the arrow being deleted originates
 * @param {Shape} toShape - the shape to which the arrow being deleted connects
 * @param {Pcarrow} arrowToDelete - the arrow being deleted
 * @return {Boolean} true if it is safe to remove the connection between these shapes
 */
function shouldRemoveConnection(fromShape, toShape, arrowToDelete) {
    var isSafe = true;
    fromArrows = _.without(fromShape.arrowsOut, arrowToDelete.arrowId);
    _.each(fromArrows, function(arrowid) {
        var thearrow = getArrowByID(arrowid)
        if(thearrow.toShape === toShape.shapeId) {
            isSafe = false;
        }
    });
    dbgconsolelog("It was "+(isSafe ? "" : "not ")+"safe to remove the connection");
    return isSafe;
}

$(function() {

    router = new App.Router();

    var selectedShape;

    //disable browser context menu on canvas
    $('body').on('contextmenu', 'canvas', function(e) {
        return false;
    });

    var menuHide = function(menustring) {
        $(menustring).hide();
        $(document).off('click.hideShapeMenu');
    }

    //add popup menus on canvas right-click
    //TODO -- need a better fix than setTimeout for Firefox
    $('#appview').on('dblclick.canvascontext', '#edit-canvas-wrapper canvas, #clone-canvas-wrapper canvas', function(e) {
        var x,y;
        var xx = e.pageX;
        var yy = e.pageY;
        if(e.offsetX==undefined) {
            x = xx - $('#main-canvas').offset().left;
            y = yy - $('#main-canvas').offset().top;
        } else {
            x = e.offsetX;
            y = e.offsetY;
        }
        dbgconsolelog('Clicked canvas at ' + x + ", " + y);
        dbgconsolelog('Page coordinates: ' + xx + ", " + yy);
        //TODO - change behavior for lines
        var found = false;
        _.each(canvas._objects, function(o) {
            if (!found) {
                var w = o.width / 2;
                var h = o.height / 2;
                if (x >= (o.left - w) && x <= (o.left + w)) {
                    if (y >= (o.top - h) && y <= (o.top + h)) {
                        dbgconsolelog("clicked object " + o.toString());
                        if (!o.inSidebar) {
                            if (isArrow(o) && !(canvas.isTargetTransparent(o, x, y))) {
                                var menustring = '#dropdown-arrow-' + o.arrowId;
                                var menuOffsetParent = $('.content').first();
                                $("ul[id^='dropdown-']").css({
                                    display: 'none'
                                }).removeClass('open');
                                dbgconsolelog("Showing " + menustring);
                                $(menustring).attr('style', '')
                                    .css({
                                        display: 'block',
                                        position: 'absolute',
                                        left: xx - menuOffsetParent.offset().left,
                                        top: yy - menuOffsetParent.offset().top
                                    })
                                    .addClass('open');
                                $(menustring).on('click', 'a', function(e) {
                                    e.stopPropagation();
                                    menuHide(menustring);
                                });
                                //window.setTimeout(function() {
                                    $('body').on('click.hideShapeMenu', function() {
                                        menuHide(menustring);
                                    });
                                //}, 50);
                                found = true;
                            } else if (isGroupContainingNonSidebarShape(o)) {
                                var menustring = '#dropdown-' + (getShapeFromGroup(o)).shapeId;
                                var menuOffsetParent = $('.content').first();
                                $("ul[id^='dropdown-']").css({
                                    display: 'none'
                                }).removeClass('open');
                                dbgconsolelog("Showing " + menustring);
                                $(menustring).attr('style', '')
                                    .css({
                                        display: 'block',
                                        position: 'absolute',
                                        left: xx - menuOffsetParent.offset().left,
                                        top: yy - menuOffsetParent.offset().top
                                    })
                                    .addClass('open');
                                $(menustring).on('click', 'a', function(e) {
                                    e.stopPropagation();
                                    menuHide(menustring);
                                });
                                //window.setTimeout(function() {
                                    $('body').on('click.hideShapeMenu', function() {
                                        menuHide(menustring);
                                    });
                                //}, 500);
                                found = true;
                            } else if (isNonSidebarShape(o)) {
                                var menustring = '#dropdown-' + o.shapeId;
                                var menuOffsetParent = $('.content').first();
                                $("ul[id^='dropdown-']").css({
                                    display: 'none'
                                }).removeClass('open');
                                dbgconsolelog("Showing " + menustring);
                                $(menustring).attr('style', '')
                                    .css({
                                        display: 'block',
                                        position: 'absolute',
                                        left: xx - menuOffsetParent.offset().left,
                                        top: yy - menuOffsetParent.offset().top
                                    })
                                    .addClass('open');
                                $(menustring).on('click', 'a', function(e) {
                                    e.stopPropagation();
                                    menuHide(menustring);
                                });
                                //window.setTimeout(function() {
                                    $('body').on('click.hideShapeMenu', function() {
                                        menuHide(menustring);
                                    });
                                //}, 500);
                                found = true;
                            }
                        }
                    }
                }
            }
        });
    });

    $('#appview').on('mouseup', 'canvas', function(e) {
        if (e.which === 1 && onviewpage) {
            var x,y;
            var xx = e.pageX;
            var yy = e.pageY;
            if(e.offsetX==undefined) {
                x = xx - $('#main-canvas').offset().left;
                y = yy - $('#main-canvas').offset().top;
            } else {
                x = e.offsetX;
                y = e.offsetY;
            }
            dbgconsolelog('Clicked canvas at ' + x + ", " + y);
            dbgconsolelog('Page coordinates: ' + xx + ", " + yy);
            var found = false;
            _.each(canvas._objects, function(o) {
                if (!found) {
                    var w = o.width / 2;
                    var h = o.height / 2;
                    if (x >= (o.left - w) && x <= (o.left + w)) {
                        if (y >= (o.top - h) && y <= (o.top + h)) {
                            //e.stopPropagation();
                            dbgconsolelog("clicked object " + o.toString());
                            if (!o.inSidebar) {
                                selectedShape = o;
                                if (isArrow(o) && !(canvas.isTargetTransparent(o, x, y))) {
                                    var menustring = '#dropdown-arrow-' + o.arrowId;
                                    dbgconsolelog("Triggering click for " + menustring +" a .showshapesecondary");
                                    $(menustring+" a.showarrowsecondary").trigger("click");
                                    highlightArrow(o);
                                    found = true;
                                } else if (isGroupContainingNonSidebarShape(o)) {
                                    var menustring = '#dropdown-' + (getShapeFromGroup(o)).shapeId;
                                    dbgconsolelog("Triggering click for " + menustring +" a .showshapesecondary");
                                    $(menustring+" a.showshapesecondary").trigger("click");
                                    found = true;
                                } else if (isNonSidebarShape(o)) {
                                    var menustring = '#dropdown-' + o.shapeId;
                                    dbgconsolelog("Triggering click for " + menustring +" a .showshapesecondary");
                                    $(menustring+" a.showshapesecondary").trigger("click");
                                    highlightShape(o);
                                    found = true;
                                }
                                if (canvasNav)
                                    canvasNav.scrollToObject(selectedShape);
                            }
                        }
                    }
                }
            });
            if (found) {
            }
            else {
                //this.$el.removeClass('secondary-open');
                //this.$el.fadeOut();
                //if (this.type === "shape") {
                    //dbgconsolelog("thisshape = "+thisshape);
                    //removeHighlightFromShape(thisshape);
                //} else if (this.type === "arrow") {
                    //dbgconsolelog("thisarrow = "+this.arrow);
                    //removeHighlightFromArrow(thisarrow);
                //} else {
                    //dbgconsolelog("Unsupported type!");
                //}
                //canvas.renderAll();
                //$(".secondary-open .close-panel-button").click();
            }
        }
        if ((e.which === 3)) {
            var x,y;
            var xx = e.pageX;
            var yy = e.pageY;
            if(e.offsetX==undefined) {
                x = xx - $('#main-canvas').offset().left;
                y = yy - $('#main-canvas').offset().top;
            } else {
                x = e.offsetX;
                y = e.offsetY;
            }
            dbgconsolelog('Clicked canvas at ' + x + ", " + y);
            dbgconsolelog('Page coordinates: ' + xx + ", " + yy);
            //TODO - change behavior for lines
            var found = false;
            _.each(canvas._objects, function(o) {
                if (!found) {
                    var w = o.width / 2;
                    var h = o.height / 2;
                    if (x >= (o.left - w) && x <= (o.left + w)) {
                        if (y >= (o.top - h) && y <= (o.top + h)) {
                            dbgconsolelog("clicked object " + o.toString());
                            if (!o.inSidebar) {
                                if (isArrow(o) && !(canvas.isTargetTransparent(o, x, y))) {
                                    var menustring = '#dropdown-arrow-' + o.arrowId;
                                    $("ul[id^='dropdown-']").css({
                                        display: 'none'
                                    }).removeClass('open');
                                    dbgconsolelog("Showing " + menustring);
                                    var menuOffsetParent = $('.content').first();
                                    $(menustring).attr('style', '')
                                        .css({
                                            display: 'block',
                                            position: 'absolute',
                                            left: xx - menuOffsetParent.offset().left,
                                            top: yy - menuOffsetParent.offset().top
                                        })
                                        .addClass('open');
                                    $(menustring).on('click', 'a', function(e) {
                                        e.stopPropagation();
                                        menuHide(menustring);
                                    });
                                    //window.setTimeout(function() {
                                        $('body').on('click.hideShapeMenu', function() {
                                            menuHide(menustring);
                                        });
                                    //}, 50);
                                    found = true;
                                } else if (isGroupContainingNonSidebarShape(o)) {
                                    var menustring = '#dropdown-' + (getShapeFromGroup(o)).shapeId;
                                    $("ul[id^='dropdown-']").css({
                                        display: 'none'
                                    }).removeClass('open');
                                    dbgconsolelog("Showing " + menustring);
                                    var menuOffsetParent = $('.content').first();
                                    $(menustring).attr('style', '')
                                        .css({
                                            display: 'block',
                                            position: 'absolute',
                                            left: xx - menuOffsetParent.offset().left,
                                            top: yy - menuOffsetParent.offset().top
                                        })
                                        .addClass('open');
                                    $(menustring).on('click', 'a', function(e) {
                                        e.stopPropagation();
                                        menuHide(menustring);
                                    });
                                    //window.setTimeout(function() {
                                        $('body').on('click.hideShapeMenu', function() {
                                            menuHide(menustring);
                                        });
                                    //}, 500);
                                    found = true;
                                } else if (isNonSidebarShape(o)) {
                                    var menustring = '#dropdown-' + o.shapeId;
                                    $("ul[id^='dropdown-']").css({
                                        display: 'none'
                                    }).removeClass('open');
                                    dbgconsolelog("Showing " + menustring);
                                    var menuOffsetParent = $('.content').first();
                                    $(menustring).attr('style', '')
                                        .css({
                                            display: 'block',
                                            position: 'absolute',
                                            left: xx - menuOffsetParent.offset().left,
                                            top: yy - menuOffsetParent.offset().top
                                        })
                                        .addClass('open');
                                    $(menustring).on('click', 'a', function(e) {
                                        e.stopPropagation();
                                        menuHide(menustring);
                                    });
                                    //window.setTimeout(function() {
                                        $('body').on('click.hideShapeMenu', function() {
                                            menuHide(menustring);
                                        });
                                    //}, 500);
                                    found = true;
                                }
                            }
                        }
                    }
                }
            });
            if(!onviewpage && !found) {
                //show right-click paste menu
                //console.log("Right clicked on free canvas area");
                pasteX = x;
                pasteY = y;
                if(typeof copiedObject !== 'undefined') {
                    var menustring = '#dropdown-pastemenu';
                    $("ul[id^='dropdown-']").css({
                        display: 'none'
                    }).removeClass('open');
                    dbgconsolelog("Showing " + menustring);
                    var menuOffsetParent = $('.content').first();
                    $(menustring).attr('style', '')
                        .css({
                            display: 'block',
                            position: 'absolute',
                            left: xx - menuOffsetParent.offset().left,
                            top: yy - menuOffsetParent.offset().top
                        })
                        .addClass('open');
                    $(menustring).on('click', 'a', function(e) {
                        e.stopPropagation();
                        menuHide(menustring);
                    });
                    //window.setTimeout(function() {
                        $('body').on('click.hideShapeMenu', function() {
                            menuHide(menustring);
                        });
                    //}, 500);
                }
            }
        }
    })

    /*$("#label-text-form").dialog({
        autoOpen: false,
        height: 300,
        width: 350,
        modal: true,
        buttons: {
            Save: function() {
                dbgconsolelog("Saved label text \"" + $('#inputLabelText').val() + "\"");
                itemToLabel.labelText = $('#inputLabelText').val();
                $(this).dialog("close");
            },
            Cancel: function() {
                $(this).dialog("close");
            }
        }
    });*/

    $('#save-label-text').click(function() {
        dbgconsolelog("Saved label text \"" + $('#inputLabelText').val() + "\"");
        itemToLabel.labelText = $('#inputLabelText').val();
        dbgconsolelog("Saved secondary text \"" + $('#inputSecondaryText').val() + "\"");
        itemToLabel.secondaryText = $('#inputSecondaryText').val();
        dispatcher.trigger('labelTextChangedEvent');
        $('#myModal').modal('hide');
        canvas.renderAll();
    })

    $('#inputLabelText').on('keydown', function(e) {
        if (e.which === 13 || e.keyCode === 13) {
            e.preventDefault();
            $('#inputSecondaryText').redactor('focusEnd');
        }
    });

});

$(document).ready(function() {
    analytics = window.analytics;

    /*$('#inputTitle').editable({
        emptytext: "Click here to add a title",
        success: function(response, newValue) {
            chartTitle = newValue;
        }
    });*/

    $('#inputLabelText').maxlength();


    $("abbr.timeago").timeago();

    $('#myModal').on('shown.bs.modal', function () {
        $('#inputLabelText').focus();
    })

    /*$('form[name="login_user_form"]').submit(function(e) {
        var theuser = $('input#email').val();
        var thepassword = $('input#password').val();
    })*/
});

/* csrf business */
var csrftoken = $('meta[name=csrf-token]').attr('content')

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type)) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken)
        }
    }
});
