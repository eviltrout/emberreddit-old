// Create our Application
(function () {

  // Default subreddits to include
  var defaultSubreddits = [
    'aww',
    'ArchitecturePorn',
    'foodporn',
    'funny',
    'sushi',
    'videos'
  ];

  window.EmberReddit = Ember.Application.create({});

  EmberReddit.Subreddit = Ember.Object.extend({
    loadedLinks: false,

    title: function() {
      return "/r/" + this.get('id');
    }.property('id'),

    /*
      Load the links associated with this subreddit.

      It returns a promise that will resolve to be the list of links from reddit. A special case is that
      if we've already loaded the links, we resolve to that right away rather than loading them a second
      time.
    */
    loadLinks: function() {
      var subreddit = this;
      return Em.Deferred.promise(function (p) {

        if (subreddit.get('loadedLinks')) {
          // We've already loaded the links, let's return them!
          p.resolve(subreddit.get('links'));
        } else {

          // If we haven't loaded the links, load them via JSON
          p.resolve($.getJSON("http://www.reddit.com/r/" + subreddit.get('id') + "/.json?jsonp=?").then(function(response) {
            var links = Em.A();
            response.data.children.forEach(function (child) {
              child.data.subreddit = subreddit;
              links.pushObject(EmberReddit.Link.create(child.data));
            });
            subreddit.setProperties({links: links, loadedLinks: true});
            return links;
          }));
        }
      });
    },

    findLinkById: function(id) {
      return this.loadLinks().then(function (links) {
        return links.findProperty('id', id);
      });
    }

  });

  /*
     Note: `reopenClass` sounds scary but it's pretty simple. We're just defining class level methods
     instead of instance methods. That way we can say `EmberReddit.Subreddit.list()` to get a list of
     subreddits.
  */
  EmberReddit.Subreddit.reopenClass({

    /*
      This class method returns a list of all our subreddits. We store them in a class variable
      so they will only be created and referenced once.
    */
    list: function(id) {
      // If we've already loaded the list, return it
      if (this._list) { return this._list; }

      var list = Em.A();
      defaultSubreddits.forEach(function (id) {
        list.pushObject(EmberReddit.Subreddit.create({id: id}));
      });

      // Remember what we've created so we don't request it twice.
      this._list = list;
      return list;
    },

    /*
      Returns the default subreddit to show if the user hasn't selected one.
    */
    defaultSubreddit: function() {
      return this.list()[0];
    }

  });

  // Our Link model
  EmberReddit.Link = Ember.Object.extend({
    /*
      It seems reddit will return the string "default" or "self" when there's no thumbnail
      present.

      This computed property will convert "default" or "self" to null to avoid rendering a broken
      image link.
    */
    thumbnailUrl: function() {
      var thumbnail = this.get('thumbnail');
      return ((thumbnail === 'default') || (thumbnail === 'self')) ? null : thumbnail;
    }.property('thumbnail'),

    image: function() {
      var url = this.get('url');
      if (!url) { return false; }
      if (url.match(/\.(jpeg|jpg|gif|png)$/) !== null) { return true; }
      if (url.match(/imgur\.com\//) !== null) { return true; }
      return false;
    }.property('url'),

    embed: function() {
      var result = this.get('media_embed.content');
      if (!result) return null;

      return result.replace("&lt;", "<").replace("&rt;", ">");
    }.property('media_embed.content'),

    imageUrl: function() {
      var url = this.get('url');
      if (!url) return false;
      if (url.match(/imgur\.com\//) !== null) return url + ".jpg";
      return url;
    }.property('url')

  });

  // Routes below
  EmberReddit.Router.map(function() {
    this.resource("subreddit", { path: "/r/:subreddit_id" }, function() {
      this.resource('link', { path: '/:link_id'} );
    });
  });

  EmberReddit.LinkRoute = Ember.Route.extend({
    model: function(params) {
      return this.modelFor('subreddit').findLinkById(params.link_id);
    }
  });

  EmberReddit.SubredditRoute = Ember.Route.extend({
    model: function(params) {
      return EmberReddit.Subreddit.list().findProperty('id', params.subreddit_id);
    },

    afterModel: function(model) {
      return model.loadLinks();
    }
  });

  EmberReddit.ApplicationView = Ember.View.extend({
    didInsertElement: function() {
        var controller = this.get('controller');
        // Attach the `keyup` event to the body element, to transition back to the subreddit's index
        // when the escape key is pressed.
        $('body').on('keyup', function(event) {
            if (event.keyCode !== 27) {
                return;
            }
            controller.transitionToRoute('subreddit');
        });
    }
  });

  EmberReddit.ApplicationRoute = Ember.Route.extend({
    setupController: function(applicationController) {
      applicationController.set('subreddits', EmberReddit.Subreddit.list());
    }
  });

  EmberReddit.IndexRoute = Ember.Route.extend({
    redirect: function() {
      this.transitionTo('subreddit', EmberReddit.Subreddit.defaultSubreddit());
    }
  });

})();
