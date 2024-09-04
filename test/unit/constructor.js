const assert = require('assert');
const session = require('express-session');
const manager = require('../manager');
const MySQLStore = require('../..')(session);

describe('constructor', function() {

	let sessionStore;
	afterEach(function() {
		if (sessionStore) return sessionStore.close();
	});

	it('MySQLStore(options)', function() {
		sessionStore = manager.createInstance();
		return sessionStore.onReady().then(() => {
			assert.notStrictEqual(typeof sessionStore.connection, 'undefined');
		});
	});

	it('MySQLStore(options, connection)', function() {
		const connection = MySQLStore.prototype.createPool(manager.config);
		sessionStore = manager.createInstance({}, connection);
		return sessionStore.onReady().then(() => {
			assert.deepStrictEqual(sessionStore.connection, connection);
		});
	});

	it('mysql2 callback interface', function() {
		const mysql = require('mysql2');
		const options = MySQLStore.prototype.prepareOptionsForMySQL2(manager.config);
		const connection = mysql.createPool(options);
		sessionStore = manager.createInstance({}, connection);
		return sessionStore.onReady().then(() => {
			assert.deepStrictEqual(sessionStore.connection, connection);
			return sessionStore.length();
		});
	});

	describe('options', function() {

		describe('clearExpired', function() {

			describe('TRUE', function() {

				it('should call clearExpiredSessions', function() {
					return new Promise((resolve, reject) => {
						try {
							sessionStore = manager.createInstance({
								checkExpirationInterval: 1,
								clearExpired: true,
							});
							// Override the clearExpiredSessions method.
							sessionStore.clearExpiredSessions = function() {
								resolve();
							};
						} catch (error) {
							return reject(error);
						}
					});
				});
			});

			describe('FALSE', function() {

				it('should not call clearExpiredSessions', function() {
					return new Promise((resolve, reject) => {
						try {
							sessionStore = manager.createInstance({
								checkExpirationInterval: 1,
								clearExpired: false,
							});
							// Override the clearExpiredSessions method.
							sessionStore.clearExpiredSessions = function() {
								reject(new Error('Should not have called clearExpiredSessions'));
							};
							setTimeout(resolve, 30);
						} catch (error) {
							return reject(error);
						}
					});
				});
			});
		});

		describe('extractDataValuesIntoCustomColumns', function() {

			describe('FALSE', function() {

				it('should throw an error when defining extra / unknown columns', function() {
					let thrownError;
					try {
						sessionStore = manager.createInstance({
																  extractDataValuesIntoCustomColumns: false,
																  schema: {
																	  columnNames: {
																		  some: "column"
																	  }
																  }
															  });
					}
					catch(error){
						thrownError = error;
					}
					assert.notStrictEqual(typeof thrownError, 'undefined');
					assert.strictEqual(thrownError.message, 'Unknown column specified ("some"). Only the following columns are configurable when the `extractDataValuesIntoCustomColumns` options is set to `false`: "session_id", "expires", "data". Please review the documentation to understand how to correctly use this option.');
				});

			});

			describe('TRUE', function() {

				it('should create extra columns', function() {
					sessionStore = manager.createInstance({
															  			extractDataValuesIntoCustomColumns: true,
																		schema: {
																  			columnNames: {
																				some: "column"
																			}
																		}
														  });
					assert.deepStrictEqual(Object.keys(sessionStore.options.schema.columnNames), ["session_id", "expires", "some"]);
				});

				it('should create extra columns, even if default columns are specified', function() {
					sessionStore = manager.createInstance({
															  extractDataValuesIntoCustomColumns: true,
															  schema: {
																  columnNames: {
																	  some: "column",
																	  data: "exists",
																	  session_id: "some_name",
																	  expires: "expires"
																  }
															  }
														  });
					assert.deepStrictEqual(Object.keys(sessionStore.options.schema.columnNames), ["session_id", "expires", "data", "some"]);
				});

			});

		})

	});
});
