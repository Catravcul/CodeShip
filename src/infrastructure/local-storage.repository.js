/**
 * @interface
 * @classdesc Represents a repository for storing and retrieving data.
 */
class StorageRepository {
  /**
   * Saves data to storage with the given key.
   * @param {string} key - The key under which to store the data.
   * @param {object} data - The data to be stored.
   */
  save(key, data) {
    // Implement in concrete storage repositories
  }

  /**
   * Loads data from storage with the given key.
   * @param {string} key - The key under which the data is stored.
   * @returns {object|null} The loaded data, or null if not found.
   */
  load(key) {
    // Implement in concrete storage repositories
  }
}

/**
 * @class
 * @classdesc Represents a storage repository that uses the browser's local storage.
 * @extends StorageRepository
 */
class LocalStorageRepository extends StorageRepository {
  /**
   * @inheritdoc
   */
  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * @inheritdoc
   */
  load(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
}

export default LocalStorageRepository