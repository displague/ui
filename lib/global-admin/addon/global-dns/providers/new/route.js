import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, setProperties } from '@ember/object';
import { all, reject } from 'rsvp';

export default Route.extend({
  globalStore: service(),

  model(params) {
    if ( get(params, 'id') ) {
      return this.globalStore.find('globaldnsprovider', params.id).then((resp) => {
        if (resp) {
          return resp.clone();
        } else {
          return reject('Global DNS Provider Not Found');
        }
      });
    } else {
      return this.initConfig(get(params, 'activeProvider') || 'route53');
    }
  },

  afterModel(model/* , transition */) {
    let { members } = model;

    if (members) {
      return this.fetchMembers(model);
    }


    return model;
  },

  setupController(controller, model) {
    if (model && get(model, 'id')) {
      controller.set('mode', 'edit');
    }

    if ( get(model, 'provider') ) {
      controller.set('activeProvider', get(model, 'provider'));
    }

    this._super(controller, model);
  },

  resetController(controller, isExiting) {
    if (isExiting) {
      setProperties(controller, {
        id:             null,
        activeProvider: 'route53',
        mode:           'new',
      })
    }
  },

  /**
   * Temporary workaround for https://github.com/ember-engines/ember-engines/issues/614 .
   * This also fixes the infinite-loop for query params with `refreshModel:true`.
   *
   * The gist: Behind the scenes, the router tries to match against `routeName`, but
   * for engines it needs to use `fullRouteName` instead or else things don't line up.
   * This is a silly hack, but setting routeName=fullRouteName seems to work A-OK.
   */
  refresh() {
    const temp = this.routeName;

    this.routeName = this.fullRouteName;
    this._super(...arguments);
    this.routeName = temp;
  },

  queryParams: {
    id:             { refreshModel: true },
    activeProvider: { refreshModel: true },
  },

  initConfig(configType = 'route53') {
    if ( configType === 'route53' ) {
      return this.globalStore.createRecord({
        type:                  'globaldnsprovider',
        providerName:          'route53',
        name:                  '',
        rootDomain:            '',
        route53ProviderConfig: {
          accessKey:  '',
          secretKey:  '',
        }
      });
    } else if ( configType === 'cloudflare' ) {
      return this.globalStore.createRecord({
        type:                     'globaldnsprovider',
        providerName:             'cloudflare',
        name:                     '',
        rootDomain:               '',
        cloudflareProviderConfig: {
          apiEmail:   '',
          apiKey:     '',
        }
      });
    } else if ( configType === 'alidns' ) {
      return this.globalStore.createRecord({
        type:                 'globaldnsprovider',
        providerName:         'alidns',
        name:                 '',
        rootDomain:           '',
        alidnsProviderConfig: {
          accessKey:  '',
          secretKey:  '',
        },
      });
    } else if ( configType === 'linode' ) {
      return this.globalStore.createRecord({
        type:                 'linodeprovider',
        providerName:         'linode',
        name:                 '',
        rootDomain:           '',
        linodeProviderConfig: {
          apiToken:  '',
        },
      });
    }
  },

  fetchMembers(model) {
    let { members } = model;

    if (members) {
      const membersPromises = [];

      members.forEach((member) => {
        if (get(member, 'userPrincipalId')) {
          membersPromises.push(this.globalStore.find('principal', member.userPrincipalId));
        } else if (get(member, 'groupPrincipalId')) {
          membersPromises.push(this.globalStore.find('principal', member.groupPrincipalId));
        }
      });

      return all(membersPromises);
    }
  },

});
