// Create our Application
(function () {

  // Default subreddits to include
  var defaultSubreddits = [
    'aww',
    'ArchitecturePorn',
    'foodporn',
    'funny',
    'sushi',
    'RetroFuturism',
    'videos'
  ];

  window.EmberReddit = Ember.Application.create({});

  EmberReddit.Subreddit = Ember.Object.extend({
    loaded: false,

    title: function() {
      return "/r/" + this.get('id');
    }.property('id'),

    loadLinks: function() {
      if (this.get('loaded')) return;

      var subreddit = this;
      $.getJSON("http://www.reddit.com/r/" + subreddit.get('id') + "/.json?jsonp=?").then(function(response) {
        var links = Em.A();
        response.data.children.forEach(function (child) {
          links.push(EmberReddit.Link.create(child.data));
        });
        subreddit.setProperties({links: links, loaded: true});
      });
    }
  });

  EmberReddit.Subreddit.reopenClass({
    store: {},

    find: function(id) {
      if (!this.store[id]) {
        this.store[id] = EmberReddit.Subreddit.create({id: id});
      }
      return this.store[id];
    }
  });

  // Our Link model
  EmberReddit.Link = Ember.Object.extend({
    /*
      It seems reddit will return the string 'default' when there's no thumbnail present.
      This computed property will convert 'default' to null to avoid rendering a broken
      image link.
    */
    thumbnailUrl: function() {
      var thumbnail = this.get('thumbnail');
      return (thumbnail === 'default') ? null : thumbnail;
    }.property('thumbnail'),

    image: function() {
      var url = this.get('url');
      if (!url) return false;
      if (url.match(/\.(jpeg|jpg|gif|png)$/) !== null) return true;
      if (url.match(/imgur\.com\//) !== null) return true;
      return false;
    }.property('url'),

    imageUrl: function() {
      var url = this.get('url');
      if (!url) return false;
      if (url.match(/imgur\.com\//) !== null) return url + ".jpg";
      return url;
    }.property('url'),

    loadDetails: function() {

      // If we have a name, we're already loaded
      if (this.get('name')) return;

      var subreddit = this;
      var url = "http://www.reddit.com/comments/" + this.get('id') + ".json?jsonp=?";
      $.getJSON(url).then(function (response) {
        subreddit.setProperties(response[0].data.children[0].data);
      });
    }

  });

  EmberReddit.Link.reopenClass({
    store: {},

    find: function(id) {
      if (!this.store[id]) {
        this.store[id] = EmberReddit.Link.create({id: id});
      }
      return this.store[id];
    }
  });

  EmberReddit.SubredditController = Ember.ObjectController.extend({});


  EmberReddit.LinkView = Ember.View.extend({
    classNames: ['link-view'],

    didInsertElement: function() {
      $('body').on('click.close-reddit-link', function (e) {
        var $target = $(e.target);
      });

      var $linkView = $('#link-view');
      console.log($('#link-view'));
    },

    willDestroy: function() {
      $('body').off('click.close-reddit-link');
    }
  });

  // Routes below
  EmberReddit.Router.map(function() {
    this.resource("subreddit", { path: "/r/:subreddit_id" }, function() {
      this.resource('link', { path: '/:link_id'} );
    });
  });

  EmberReddit.LinkRoute = Ember.Route.extend({
    serialize: function(model) {
      return {link_id: model.get('id')};
    },

    model: function(params) {
      return EmberReddit.Link.find(params.link_id);
    },

    setupController: function(controller, model) {
      model.loadDetails();
    },
  });

  EmberReddit.SubredditRoute = Ember.Route.extend({
    serialize: function(model) {
      return {subreddit_id: model.get('id')};
    },

    model: function(params) {
      return EmberReddit.Subreddit.find(params.subreddit_id);
    },

    setupController: function(controller, model) {
      model.loadLinks();
    },
  });

  EmberReddit.ApplicationRoute = Ember.Route.extend({
    setupController: function(c) {
      var subreddits = Em.A();
      defaultSubreddits.forEach(function (id) {
        subreddits.push(EmberReddit.Subreddit.find(id));
      });
      c.set('subreddits', subreddits)
    }

  });

  EmberReddit.IndexRoute = Ember.Route.extend({
    redirect: function() {
      this.transitionTo('subreddit', EmberReddit.Subreddit.find(defaultSubreddits[0]));
    }
  });



})();
