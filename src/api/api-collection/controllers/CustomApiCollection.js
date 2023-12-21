const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const cookie = require("cookie");
const { getVendorIdFromToken } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");
const { create } = require("tar");
const schema = require("../../schema");

module.exports = {
  apiCollection: async (ctx) => {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies.accessToken;
      if (!accessToken) {
        throw createError.Unauthorized();
      }

      const vendorId = await getVendorIdFromToken("accessToken", accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const lang_name = ctx.params.lang;
      const maxDepth = 4; 
      const childAttr = "child_attr_ids"
      const childAttrfields = ["attr_name", "attr_type", "attr_description"];
      const childParam = "child_attr_ids";
      const childParamFields = ["attr_name", "attr_type", "attr_description"];
      
      ctx.request.query = {
        filters: {
          api_collections: {
            access_controls: {
              vendor_id: {
                id: {
                  $eq: vendorId,
                },
                // status: {
                //   $eq: "Approved",
                // }
              },
              status: {
                $eq: "Approved",
              },
              publishedAt: {
                $null: false,
              },
            },
          },
        },
        fields: ["category_name"],
        publicationState: 'live',
        populate: {
          api_collections: {
            filters: {
              access_controls: {
                vendor_id: {
                  id: {
                    $eq: vendorId,
                  },
                },
                status: {
                  $eq: "Approved",
                },
                publishedAt: {
                  $null: false,
                },
              },
            },
            fields: ["api_collection_name", "description"],
            publicationState: 'live',
            populate: {
              object_id: {
                fields: ["object"],
                publicationState: 'live',
                populate: {
                  attr_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    publicationState: 'live',
                    populate: generatePopulate(maxDepth, childAttr, childAttrfields),
                  },
                },
              },
              api_ids: {
                fields: ["api_name", "api_description", "api_return", "api_method", "api_endpoint", "api_response_json"],
                publicationState: 'live',
                populate: {
                  api_req_code_ids: {
                    filters: {
                      lang_name: lang_name,
                    },
                    fields: ["lang_name", "api_req_code"],
                    publicationState: 'live',
                  },
                  api_param_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    publicationState: 'live',
                    populate: generatePopulate(maxDepth, childParam, childParamFields),
                  },
                },
              },
            },
          },
        },
      };
      const contentType = strapi.contentType("api::api-category.api-category");

      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );

      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );

      const result = await contentAPI.output(entities, contentType);
      if (result.length === 0) {
        return ctx.send([]);
      }
      
      result.forEach((items) => {
        items.api_collections.forEach((api_collection) => {
          api_collection.api_ids.forEach((api_id) => {
              api_id.api_req_code_ids.forEach((api_req_code_id) => {
                api_id.lang_name = api_req_code_id.lang_name;
                api_id.api_req_code = api_req_code_id.api_req_code;
              })
          })
        })
        removeEmptyChildArrays(items)
      });
      return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  subscribedApiCollection: async (ctx) => {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies.accessToken;
      if (!accessToken) {
        throw createError.Unauthorized();
      }

      const vendorId = await getVendorIdFromToken("accessToken", accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      ctx.request.query = {
        filters: {
          api_collections: {
            access_controls: {
              vendor_id: {
                id: vendorId,
              },
              status: {
                $eq: "Approved",
              },
            },
          },
        },
        fields: ["category_name"],
        publicationState: 'live',
        populate: {
          api_collections: {
            filters: {
              access_controls: {
                vendor_id: {
                  id: {
                    $eq: vendorId,
                  },
                },
                status: {
                  $eq: "Approved",
                },
              },
            },
            fields: ["api_collection_name", "description"],
            publicationState: 'live',
          },
        },
      };

      const contentType = strapi.contentType("api::api-category.api-category");

      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );

      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );

      const result = await contentAPI.output(entities, contentType);

      return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  getAllApiCollection: async (ctx) => {
    try {

      ctx.request.query = {
        fields: ['api_collection_name', 'createdAt'],
        publicationState: 'live',
        populate: {
          api_category_id: {
            fields: ['category_name'],
            publicationState: 'live',
          },
          api_ids: {
            fields:['id'],
          }
        },
      }
      const contentType = strapi.contentType("api::api-collection.api-collection");

      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );

      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );

      const result = await contentAPI.output(entities, contentType);

      result.forEach(item => {
        item.count = item.api_ids.length
        item.api_category_name = item.api_category_id.category_name;
        delete item.api_category_id;
        delete item.api_ids;
      });

      return result;
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  createApiCollection: async (ctx) => {
    try {
      const {api_collection_name, description, short_description, api_category_id} = ctx.request.body;
      const entry = await strapi.entityService.create("api::api-collection.api-collection", {
        data: {
          api_collection_name: api_collection_name,
          description: description,
          short_description: short_description,
          api_category_id: api_category_id,
          publishedAt: Date.now()
        }
      })
      ctx.send({message: `Api Collection ${entry.api_collection_name} created`})
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  deleteApiCollection: async (ctx) => {
    try {
      const collectionID = ctx.params.id;
      const findOneResult = await strapi.entityService.findOne("api::api-collection.api-collection", collectionID,{
        fields: ['api_collection_name'],
        populate: {
          access_controls: {
            fields: ["status"],
            filters: {
              status: {
                $eq: "Approved",
              }
            },
            populate: {
              vendor_id: {
                fields: ["username"]
              }
            }
          },
        }
      });
      // if(findOneResult.access_controls.length === 0){
      //   return ctx.send({message: "Please ensure no Api is in this category"});
      // }
      for(let i = 0; i < findOneResult.access_controls.length; i++){
        let usernames = [];
        findOneResult.access_controls.forEach(access_control => {
          usernames.push(access_control.vendor_id.username);
        })
        const errorMessage = `Vendor ${usernames.join(', ')} have access to Api Collection ${findOneResult.api_collection_name}`;
        console.log(errorMessage)
        return ctx.send({message: errorMessage})
      }
      const deleteEntry = await strapi.entityService.delete("api::api-collection.api-collection", collectionID)
      ctx.send({message: `Api Collection ${findOneResult.api_collection_name} is deleted`});
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  createWholeApiCollectionFromFile: async (ctx) => {
    try {
      const fileContent = ctx.request.body
      // try {
      //   const message = await checkFileContent(ctx, fileContent);
      // } catch (error) {
      //   console.log("here")
      //   await errorHandler(ctx, error)
      // }
      if(!(await checkFileContent(ctx, fileContent))) {
        return;
      }
      const {category_name, api_collection} = ctx.request.body;
      const object = api_collection.object;
      const apis = api_collection.apis;
      const object_attributes = object.attributes;

      const apiCategory = await strapi.entityService.findMany("api::api-category.api-category", {
        filters: {
          category_name: {
            $eq: category_name
          }
        }
      });
      
      return 0;
      const createApiCollection =  await strapi.entityService.create("api::api-collection.api-collection", {
        data: {
          api_collection_name: api_collection.api_collection_name,
          description: api_collection.api_collection_description,
          short_description: api_collection.api_collection_short_description,
          api_category_id: apiCategory[0].id,
          publishedAt: Date.now()
        }
      });

      const createObject = await strapi.entityService.create("api::api-coll-obj.api-coll-obj", {
        data: {
          object: object.object_json,
          api_collection: createApiCollection.id,
          publishedAt: Date.now()
        }
      });

      for(const attribute of object_attributes) {
        if(!attribute.child_attributes) {
          const createObjectAttribute = await strapi.entityService.create("api::api-coll-obj-attr.api-coll-obj-attr", {
            data: {
              attr_name: attribute.attribute_name,
              attr_type: attribute.attribute_type,
              attr_description: attribute.attribute_description,
              object_id: createObject.id,
              publishedAt: Date.now()
            }
          });
        } else {
          const childAttributesIds = await insertChildtAttributes(attribute.child_attributes, "api::api-coll-obj-attr.api-coll-obj-attr")
          const createObjectAttribute = await strapi.entityService.create("api::api-coll-obj-attr.api-coll-obj-attr", {
            data: {
              attr_name: attribute.attribute_name,
              attr_type: attribute.attribute_type,
              attr_description: attribute.attribute_description,
              object_id: createObject.id,
              child_attr_ids: childAttributesIds,
              publishedAt: Date.now()
            }
          });
        }
      }

      for(const api of apis) {
        const createApi = await strapi.entityService.create("api::api.api", {
          data: {
            api_name: api.api_name,
            api_description: api.api_description,
            api_method: api.api_method,
            api_endpoint: api.api_endpoint,
            api_return: api.api_return,
            api_response_json: api.api_response_json,
            api_collection_id: createApiCollection.id,
            publishedAt: Date.now()
          }
        });
        const api_request_codes = api.api_request_codes;
        for(const api_request_code of api_request_codes) {
          const createApiRequestCode = await strapi.entityService.create("api::api-req-code-lang.api-req-code-lang", {
            data: {
              lang_name: api_request_code.language_name,
              api_req_code: api_request_code.api_request_code,
              api_id: createApi.id,
              publishedAt: Date.now()
            }
          })
        }
        const api_parameters = api.api_parameters;
        for(const api_parameter of api_parameters) {
          if(!api_parameter.child_attributes) {
            const createApiParam = await strapi.entityService.create("api::api-param.api-param", {
              data: {
                attr_name: api_parameter.attribute_name,
                attr_type: api_parameter.attribute_type,
                attr_description: api_parameter.attribute_description,
                api_id: createApi.id,
                publishedAt: Date.now()
              }
            });
          } else {
            const childAttributesIds = await insertChildtAttributes(api_parameter.child_attributes, "api::api-param.api-param")
            const createApiParam = await strapi.entityService.create("api::api-param.api-param", {
              data: {
                attr_name: api_parameter.attribute_name,
                attr_type: api_parameter.attribute_type,
                attr_description: api_parameter.attribute_description,
                api_id: createApi.id,
                child_attr_ids: findChildAttributes,
                publishedAt: Date.now()
              }
            });
          }
        }
      }
      return api_collection;
    } catch (error) {
      await errorHandler(ctx, error)
    }
  }
};


function removeEmptyChildArrays(obj) {
  if (Array.isArray(obj)) {
    // If obj is an array, iterate through its elements
    for (let i = obj.length - 1; i >= 0; i--) {
      removeEmptyChildArrays(obj[i]);
      if (
        (Array.isArray(obj[i].child_attr_ids) && obj[i].child_attr_ids.length === 0) ||
        (Array.isArray(obj[i].child_param_id) && obj[i].child_param_id.length === 0) ||
        (Array.isArray(obj[i].enum_ids) && obj[i].enum_ids.length === 0)
      ) {
        // Remove elements with empty child_attr_ids or parent_param_id arrays
        obj.splice(i, 1);
      }
    }
  } else if (typeof obj === "object") {
    // If obj is an object, recursively call the function for its properties
    for (const key in obj) {
      if (
        (key === "child_attr_ids" && Array.isArray(obj[key]) && obj[key].length === 0) ||
        (key === "child_param_id" && Array.isArray(obj[key]) && obj[key].length === 0) ||
        (key === "enum_ids" && Array.isArray(obj[key]) && obj[key].length === 0)
      ) {
        delete obj[key]; // Remove empty child_attr_ids or parent_param_id property
      } else {
        removeEmptyChildArrays(obj[key]);
      }
    }
  }
}

function generatePopulate(depth, foreignKey, fields) {
  if (depth <= 0) {
    return {};
  }

  const populateObject = {};
  populateObject[foreignKey] = {
    fields,
    populate: {
      enum_ids: {
        fields: ["enum_name", "enum_description"],
        publicationState: 'live',
      },
      [foreignKey]: {
        fields,
      },
      populate: generatePopulate(depth - 1, foreignKey, fields)
    }
  };
  return populateObject;
}

async function insertChildtAttributes(attributes, contentType) {
  const insertedAttributeIds = [];
  for(const attribute of attributes) {
    const { attribute_name, attribute_type, attribute_description, child_attributes } = attribute;
    
    // Insert the current attribute into the database
    const createdAttribute = await strapi.entityService.create(contentType, {
      data: {
        attr_name: attribute_name,
        attr_type: attribute_type,
        attr_description: attribute_description,
        publishedAt: Date.now()
      }
    });

    // Store the ID of the inserted attribute
    insertedAttributeIds.push(createdAttribute.id);

    // If the attribute has child attributes, recursively insert them
    if (child_attributes && child_attributes.length > 0) {
      const childIds = await insertChildtAttributes(child_attributes, contentType);
      await strapi.entityService.update(contentType, createdAttribute.id, {
        data: {
          child_attr_ids: childIds
        }
      });
    }
  }
  return insertedAttributeIds;
}

async function checkFileStructure(ctx, fileContent, schema, path = []) {
  try {
    for (const key in schema) {
      // if(Array.isArray(schema[key])) console.log(schema + " " + key)
      const expectedType = schema[key];
      console.log(typeof expectedType + " " + key)
      if(!fileContent) return;
      if (!(key in fileContent) ) { //&& !fileContent
        ctx.send({error: `Missing key \'${key}\' at path: ${path.join('.')}`});
      } else if (typeof fileContent[key] !== typeof expectedType) {
        ctx.send({error: `Incorrect type for key \'${key}\' at path: ${path.join('.')}. Expected ${typeof expectedType}, got ${typeof fileContent[key]}`});
      } else if (typeof expectedType === 'object' && fileContent[key] !== null ) { //&& key.length !== 1
        checkFileStructure(ctx, fileContent[key], schema[key], path.concat(key));
      }
    }
  } catch (error) {
    await errorHandler(ctx, error)
  }
}

async function checkFileContent(ctx, fileContent) {
  try {
    //check key of api category
    for(const key in schema.getSchemaApiCategory()) {
      if(!(await checkKeyExistAndTypeOfValue(ctx, key, fileContent, schema.getSchemaApiCategory()))) {
        return;
      }
    }

    //check key of api collection
    fileContent = fileContent["api_collection"];
    for(const key in schema.getSchemaApiCollection()) {
      if(!(await checkKeyExistAndTypeOfValue(ctx, key, fileContent, schema.getSchemaApiCollection()))) {
        return;
      }
    }

    //check key of object
    const fileContentObject = fileContent["object"];
    for(const key in schema.getSchemaObject()) {
      if(!(await checkKeyExistAndTypeOfValue(ctx, key, fileContentObject, schema.getSchemaObject()))) {
        return;
      }
    }
    
    //check key of attributes
    const fileContentAttribute = fileContentObject["attributes"];
    checkChildAttributes(ctx, fileContentAttribute, schema.getSchemaObjectAttribute());

    //check key of apis
    const fileContentApi = fileContent["apis"];
    for(const key in schema.getSchemaApi()) {
      for(const api of fileContentApi) {
        if(!(await checkKeyExistAndTypeOfValue(ctx, key, api, schema.getSchemaApi()))) {
          return;
        }
      }
    }

    //check key of api_request_code
    for(const key in schema.getSchemaApiRequestCode()) {
      for(const api of fileContentApi) {
        const requestCodes = api["api_request_codes"];
        for(const requestCode of requestCodes) {
          if(!(await checkKeyExistAndTypeOfValue(ctx, key, requestCode, schema.getSchemaApiRequestCode()))) {
            return;
          }
          if(key === "language_name") {
            if(!(schema.getLanguageType().includes(requestCode[key]))) {
              ctx.send({error: `Language name can only be ${schema.getLanguageType()}`});
            }
          }
        }
      }
    }

    //check key of api_parameters
    for(const api of fileContentApi) {
      const fileContentParameter = api["api_parameters"];
      checkChildAttributes(ctx, fileContentParameter, schema.getSchemaApiParameter());
    }
    return true;
  } catch (error) {
    await errorHandler(ctx, error)
    return false;
  }
  
}

async function checkChildAttributes(ctx, fileContent, schema) {
  for(const key in schema) {
    for(const attribute of fileContent) {
      if(!(await checkKeyExistAndTypeOfValue(ctx, key, attribute, schema))) {
        return;
      }
      if(attribute.child_attributes) {
        checkChildAttributes(ctx, attribute.child_attributes, schema)
      }
    }
  }
}

async function checkKeyExistAndTypeOfValue(ctx, key, fileContent, schema) {
  try {
    if(!(key in fileContent)) {
      return ctx.send({error: `Missing or misspelt key \'${key}\'`});
    } else if(typeof fileContent[key] !== schema[key]) {
      return ctx.send({error: `Incorrect type for key \'${key}\'. Expected ${schema[key]}, got ${typeof fileContent[key]}`});
    }
    return true;
  } catch (error) {
    await errorHandler(ctx, error);
    return false;
  }
  
}

function getSchema() {
  const schema = {
    "category_name": "CORE RESOURCE",
    "api_collection": {
      "api_collection_name": "FYP API TESTING COLLECTION",
      "api_collection_description": "This object represents a customer of your business. Use it to create recurring charges and track payments that belong to the same customer.",
      "api_collection_short_description": "short description",
      "object": {
        "object_json": "FYP API TESTINGFYP API TESTINGFYP API TESTINGFYP API TESTING",
        "attributes": [
          {
            "attribute_name": "FYP2",
            "attribute_type": "hash",
            "attribute_description": "FYP API TESTING",
            "child_attributes": [
              {
                "attribute_name": "FYP21",
                "attribute_type": "string",
                "attribute_description": "FYP API TESTING."
              },
              {
                "attribute_name": "FYP22",
                "attribute_type": "string",
                "attribute_description": "Two-letter country code (ISO 3166-1 alpha-2)."
              },
              {
                "attribute_name": "FYP23",
                "attribute_type": "enum",
                "attribute_description": "Two-letter country code (ISO 3166-1 alpha-2).",
                "child_attributes": [
                  {
                      "attribute_name": "enumFYP23",
                      "attribute_type": "enum",
                      "attribute_description": "test enum"
                  }
                ]
              }
            ]
          },
          {
            "attribute_name": "FYP3",
            "attribute_type": "hash",
            "attribute_description": "FYP API TESTING",
            "child_attributes": [
              {
                "attribute_name": "FYP31",
                "attribute_type": "hash",
                "attribute_description": "FYP API TESTING",
                "child_attributes": [
                  {
                    "attribute_name": "FYP311",
                    "attribute_type": "string",
                    "attribute_description": "FYP API TESTING",
                    "child_attributes": [
                      {
                          "attribute_name": "FYP3111",
                          "attribute_type": "string",
                          "attribute_description": "FYP API TESTING"
                      },
                      {
                          "attribute_name": "FYP3112",
                          "attribute_type": "string",
                          "attribute_description": "FYP API TESTING"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      "apis": [
        {
          "api_name": "FYPTESTAPI",
          "api_description": "FYP TEST API",
          "api_return": "Returns API TEST",
          "api_method": "POST",
          "api_endpoint": "/v1/fyp-test-api",
          "api_response_json": "test api",
          "api_request_codes": [
            {
              "language_name": "java",
              "api_request_code": "java test;"
            },
            {
              "language_name": "javascript",
              "api_request_code": "javascript test;"
            }
          ],
          "api_parameters": [
            {
              "attribute_name": "test1",
              "attribute_type": "testdas",
              "attribute_description": "test.",
              "child_attributes": [
                  {
                      "attribute_name": "test1.1",
                      "attribute_type": "testdas1",
                      "attribute_description": "testapi",
                      "child_attributes": [
                          {
                              "attribute_name": "test1.1.1",
                              "attribute_type": "testdas11",
                              "attribute_description": "testapi2"
                          },
                          {
                              "attribute_name": "test1.1.2",
                              "attribute_type": "testdas12",
                              "attribute_description": "testapi3"
                          }
                      ]
                  }
              ]
            },
            {
              "attribute_name": "test api",
              "attribute_type": "yeesitn",
              "attribute_description": "lorem phileo"
            }
          ]
        },
        {
          "api_name": "FYP TEST API 2",
          "api_description": "Retriczxczxczxct.",
          "api_return": "Retuzdvzczxcxza deleted property that’s set to true.",
          "api_method": "POST",
          "api_endpoint": "/v1/fyp-test-api2",
          "api_response_json": "{\n  \"asfsafa\n  \"livasfsadasdn}",
          "api_request_codes": [
            {
              "language_name": "java",
              "api_request_code": "Stripe.apiKey = \"sk_test_4eC39HqLyjWDarjtT1zdp7dc\";\n\nCustomer customer =\n  Customer.retrieve(\"cus_9s6XKzkNRiz8i3\");"
            },
            {
              "language_name": "php",
              "api_request_code": "php test;"
            }
          ],
          "api_parameters": []
        }
      ]
    }
  }

  return schema;
  
}

async function findChildAttributes(attribute, childAttributesId) {


  attribute.forEach(async (child) => {
    if(!child.child_attributes) {
      const createObjectAttribute = await strapi.entityService.create("api::api-coll-obj-attr.api-coll-obj-attr", {
            data: {
              attr_name: attribute.attribute_name,
              attr_type: attribute.attribute_type,
              attr_description: attribute.attribute_description,
              publishedAt: Date.now()
            }
          });
      childAttributesId.push(createObjectAttribute.id);
      // return; 
    }
    // findChildAttributes(child, childAttributesId)
    else {
      findChildAttributes
    }
    const createObjectAttribute = await strapi.entityService.create("api::api-coll-obj-attr.api-coll-obj-attr", {
      data: {
        attr_name: attribute.attribute_name,
        attr_type: attribute.attribute_type,
        attr_description: attribute.attribute_description,
        child_attr_ids: childAttributesId,
        publishedAt: Date.now()
      }
    });
    childAttributesId = [];
  })
  findChildAttributes(attribute.child_attributes, childAttributesId);
  return;
}

  // if(!attribute.child_attributes) {
  //   const createObjectAttribute = await strapi.entityService.create("api::api-coll-obj-attr.api-coll-obj-attr", {
  //     data: {
  //       attr_name: attribute.attribute_name,
  //       attr_type: attribute.attribute_type,
  //       attr_description: attribute.attribute_description,
  //       publishedAt: Date.now()
  //     }
  //   });
  //   childAttributesId.push(createObjectAttribute.id);
  //   return;
  // }


  /*
      ALL OF THE NAMES ARE BASED ON JSON INPUT, NOT NAMED DEFINED IN STRAPI, HENCE WILL HAVE DIFFERENT NAME
      FIRST LEVEL: api_collection (1 only)
        ATTRIBUTES: 
        1. api_collection_name
        2. api_collection_description
        3. api_category_id (this is apiCategory[0].id)

      SECOND LEVEL PART 1: object (1 only)
        ATTRIBUTES:
        1. object_json
        2. api_collection_id (this can be obtained after creating api_collection)

        THIRD LEVEL FOR SECOND PART 1: attributes (an array of attributes)
        ATTRIBUTES:
        1. attribute_name
        2. attribute_type,
        3. attribute_description
        *4. object_id (this can be obtained after creating object) (NOTE: this is only needed for the first level, for its child does not need this attribute)
        ***
        5. enums? (check if enums is available, if yes will have a sub level of this attribute object)
        6. child_attributes? (check if child_attributes is available, if yes will have a sub level of this attribute object)
        ***

      SECOND LEVEL PART 2: apis (an array of apis)
        ATTRIBUTES:
        1. api_name
        2. api_description
        3. api_return
        4. api method
        5. api_endpoint
        6. api_response_json
        7. api_collection_id (this can be obtained after creating api_collection)

        THIRD LEVEL FOR SECOND PART 2 (PART 1): api_parameters (an array of api_parameters)
        ATTRIBUTES:
        1. attribute_name
        2. attribute_type,
        3. attribute_description
        *4. api_id (this can be obtained after creating api) (NOTE: this is only needed for the first level, for its child does not need this attribute)
        ***
        5. enums? (check if enums is available, if yes will have a sub level of this attribute object)
        6. child_attributes? (check if child_attributes is available, if yes will have a sub level of this attribute object)
        ***
      
        THIRD LEVEL FOR SECOND PART 2 (PART 2): api_request_codes (an array of api_request_codes)
        ATTRIBUTES:
        1. language_name (java, python, go, http, javascript, php, ruby)
        2. api_request_code
      */