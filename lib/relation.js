'use strict';
var _ = require('underscore');

module.exports = function(ML) {
  /**
   * Creates a new Relation for the given parent object and key. This
   * constructor should rarely be used directly, but rather created by
   * ML.Object.relation.
   * @param {ML.Object} parent The parent of this relation.
   * @param {String} key The key for this relation on the parent.
   * @see ML.Object#relation
   * @class
   *
   * <p>
   * A class that is used to access all of the children of a many-to-many
   * relationship.  Each instance of ML.Relation is associated with a
   * particular parent object and key.
   * </p>
   */
  ML.Relation = function(parent, key) {
    if (! _.isString(key)) {
      throw new TypeError('key must be a string');
    }
    this.parent = parent;
    this.key = key;
    this.targetClassName = null;
  };

  /**
   * Creates a query that can be used to query the parent objects in this relation.
   * @param {String} parentClass The parent class or name.
   * @param {String} relationKey The relation field key in parent.
   * @param {ML.Object} child The child object.
   * @return {ML.Query}
   */
  ML.Relation.reverseQuery = function(parentClass, relationKey, child){
    var query = new ML.Query(parentClass);
    query.equalTo(relationKey, child._toPointer());
    return query;
  };

  ML.Relation.prototype = {
    /**
     * Makes sure that this relation has the right parent and key.
     */
    _ensureParentAndKey: function(parent, key) {
      this.parent = this.parent || parent;
      this.key = this.key || key;
      if (this.parent !== parent) {
        throw "Internal Error. Relation retrieved from two different Objects.";
      }
      if (this.key !== key) {
        throw "Internal Error. Relation retrieved from two different keys.";
      }
    },

    /**
     * Adds a ML.Object or an array of ML.Objects to the relation.
     * @param {} objects The item or items to add.
     */
    add: function(objects) {
      if (!_.isArray(objects)) {
        objects = [objects];
      }

      var change = new ML.Op.Relation(objects, []);
      this.parent.set(this.key, change);
      this.targetClassName = change._targetClassName;
    },

    /**
     * Removes a ML.Object or an array of ML.Objects from this relation.
     * @param {} objects The item or items to remove.
     */
    remove: function(objects) {
      if (!_.isArray(objects)) {
        objects = [objects];
      }

      var change = new ML.Op.Relation([], objects);
      this.parent.set(this.key, change);
      this.targetClassName = change._targetClassName;
    },

    /**
     * Returns a JSON version of the object suitable for saving to disk.
     * @return {Object}
     */
    toJSON: function() {
      return { "__type": "Relation", "className": this.targetClassName };
    },

    /**
     * Returns a ML.Query that is limited to objects in this
     * relation.
     * @return {ML.Query}
     */
    query: function() {
      var targetClass;
      var query;
      if (!this.targetClassName) {
        targetClass = ML.Object._getSubclass(this.parent.className);
        query = new ML.Query(targetClass);
        query._extraOptions.redirectClassNameForKey = this.key;
      } else {
        targetClass = ML.Object._getSubclass(this.targetClassName);
        query = new ML.Query(targetClass);
      }
      query._addCondition("$relatedTo", "object", this.parent._toPointer());
      query._addCondition("$relatedTo", "key", this.key);

      return query;
    }
  };
};
