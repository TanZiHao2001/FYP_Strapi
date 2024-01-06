const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const cookie = require("cookie");
const { getVendorIdFromToken, checkAccessVendor, checkAccessAdmin } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");
const { create } = require("tar");
const schema = require("../../schema");

module.exports = {
  apiCollection: async (ctx) => {
    try {
      const vendorId = await checkAccessVendor(ctx)
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
  getOneapiCollection: async (ctx) => {
    try {
      const vendorId = await checkAccessVendor(ctx)
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const {apiCollectionId, programmingLanguage} = ctx.request.body;
      const maxDepth = 4; 
      const childAttr = "child_attr_ids"
      const childAttrfields = ["attr_name", "attr_type", "attr_description"];
      const childParam = "child_attr_ids";
      const childParamFields = ["attr_name", "attr_type", "attr_description"];
      const getApiCategoryId = await strapi.entityService.findOne("api::api-collection.api-collection", apiCollectionId, {
        populate: {
          api_category_id: {
            fields: ["category_name"]
          }
        }
      });
      ctx.request.query = {
        fields: ["category_name"],
        filters: {
          id: {
            $eq: getApiCategoryId.api_category_id.id
          }
        },
        populate: {
          api_collections: {
            filters: {
              id: {
                $eq: apiCollectionId
              }
            },
            fields: ["api_collection_name", "description"],
            populate: {
              object_id: {
                fields: ["object"],
                populate: {
                  attr_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    populate: generatePopulateForDraft(maxDepth, childAttr, childAttrfields),
                  },
                },
              },
              api_ids: {
                fields: ["api_name", "api_description", "api_return", "api_method", "api_endpoint", "api_response_json"],
                populate: {
                  api_req_code_ids: {
                    filters: {
                      lang_name: programmingLanguage,
                    },
                    fields: ["lang_name", "api_req_code"],
                  },
                  api_param_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    populate: generatePopulateForDraft(maxDepth, childParam, childParamFields),
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
      const firstResult = result[0];
      firstResult.api_collections.forEach((api_collection) => {
        api_collection.api_ids.forEach((api_id) => {
            api_id.api_req_code_ids.forEach((api_req_code_id) => {
              api_id.lang_name = api_req_code_id.lang_name;
              api_id.api_req_code = api_req_code_id.api_req_code;
            })
        })
        removeEmptyChildArrays(api_collection)
      });
      return firstResult;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  subscribedApiCollection: async (ctx) => {
    try {
      const vendorId = await checkAccessVendor(ctx)
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
  //the function below might not be in use, need to double check
  getAllApiCollection: async (ctx) => {
    try {
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
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
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
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
        if (!(await checkAccessAdmin(ctx))) {
          throw createError.Unauthorized();
        }
        const id = ctx.params.id;
        const maxDepth = 4; 
        const childAttr = "child_attr_ids"
        const childAttrfields = ["attr_name", "attr_type", "attr_description"];
        const childParam = "child_attr_ids";
        const childParamFields = ["attr_name", "attr_type", "attr_description"];
        
        ctx.request.query = {
          filters: {
            api_collections: {
              id: {
                $eq: id
              }
            },
          },
          fields: ["category_name"],
          populate: {
            api_collections: {
              filters: {
                id: {
                  $eq: id
                }
              },
              fields: ["api_collection_name", "description", "short_description"],
              populate: {
                object_id: {
                  fields: ["object"],
                  populate: {
                    attr_ids: {
                      fields: ["attr_name", "attr_type", "attr_description"],
                      populate: generatePopulate(maxDepth, childAttr, childAttrfields),
                    },
                  },
                },
                api_ids: {
                  fields: ["api_name", "api_description", "api_return", "api_method", "api_endpoint", "api_response_json"],
                  populate: {
                    api_req_code_ids: {
                      fields: ["lang_name", "api_req_code"],
                    },
                    api_param_ids: {
                      fields: ["attr_name", "attr_type", "attr_description"],
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
        
        result.forEach(async (apiCategory) => {
          removeEmptyChildArrays(apiCategory)
          apiCategory.api_collections.forEach(async (apiCollection) => {
            const deleteApiCollection = await strapi.entityService.delete("api::api-collection.api-collection", apiCollection.id);
            const deleteObject = await strapi.entityService.delete("api::api-coll-obj.api-coll-obj", apiCollection.object_id.id);
            apiCollection.object_id.attr_ids.forEach(async (attribute) => {
              const deleteObjectAttribute = await strapi.entityService.delete("api::api-coll-obj-attr.api-coll-obj-attr", attribute.id);
              deleteChildAttribute(attribute);
            })
            apiCollection.api_ids.forEach(async (api) => {
              const deleteApi = await strapi.entityService.delete("api::api.api", api.id)
              api.api_req_code_ids.forEach(async (apiReqCode) => {
                const deleteApiReqCode = await strapi.entityService.delete("api::api-req-code-lang.api-req-code-lang", apiReqCode.id);
              })
              api.api_param_ids.forEach(async (apiParam) => {
                const deleteApiParam = await strapi.entityService.delete("api::api-param.api-param", apiParam.id);
                deleteChildAttribute(apiParam);
              })
            })
          })
        });
        ctx.send({message: "Create Api Collection Has Been Cancelled"})
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  createWholeApiCollectionFromFile: async (ctx) => {
    try {
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
      const fileContent = ctx.request.body
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
      
      const createApiCollection =  await strapi.entityService.create("api::api-collection.api-collection", {
        data: {
          api_collection_name: api_collection.api_collection_name,
          description: api_collection.api_collection_description,
          short_description: api_collection.api_collection_short_description,
          api_category_id: apiCategory[0].id
        }
      });

      const createObject = await strapi.entityService.create("api::api-coll-obj.api-coll-obj", {
        data: {
          object: object.object_json,
          api_collection: createApiCollection.id
        }
      });

      for(const attribute of object_attributes) {
        if(!attribute.child_attributes) {
          const createObjectAttribute = await strapi.entityService.create("api::api-coll-obj-attr.api-coll-obj-attr", {
            data: {
              attr_name: attribute.attribute_name,
              attr_type: attribute.attribute_type,
              attr_description: attribute.attribute_description,
              object_id: createObject.id
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
              child_attr_ids: childAttributesIds
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
            api_collection_id: createApiCollection.id
          }
        });
        const api_request_codes = api.api_request_codes;
        for(const api_request_code of api_request_codes) {
          const createApiRequestCode = await strapi.entityService.create("api::api-req-code-lang.api-req-code-lang", {
            data: {
              lang_name: api_request_code.language_name,
              api_req_code: api_request_code.api_request_code,
              api_id: createApi.id
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
                api_id: createApi.id
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
                child_attr_ids: findChildAttributes
              }
            });
          }
        }
      }
      ctx.send({id: createApiCollection.id})
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  getFileContent: async (ctx) => {
    try {
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
      const fileContent = ctx.request.body
      console.log(fileContent.file)
      console.log(JSON.parse(fileContent.file))
      if(!(await checkFileContent(ctx, JSON.parse(fileContent.file)))) {
        return;
      }
      const {api_collection} = JSON.parse(fileContent.file);
      const object = api_collection.object;
      const apis = api_collection.apis;
      const object_attributes = object.attributes;

      const apiCategory = await strapi.entityService.findOne("api::api-category.api-category", ctx.request.body.categoryId)
      if(!apiCategory) {
        ctx.send({error: "Api Category Does Not Exist!"});
      }

      const checkApiCollectionName = await strapi.entityService.findMany("api::api-collection.api-collection", {
        filters: {
          api_collection_name: { 
            $eq: api_collection.api_collection_name
          }
        }
      })
      if(checkApiCollectionName.length > 0) {
        return ctx.send({error: `${checkApiCollectionName[0].api_collection_name} already exist, please change to a different name`})
      }
      // const apiCategory = await strapi.entityService.findMany("api::api-category.api-category", {
      //   filters: {
      //     category_name: {
      //       $eq: category_name
      //     }
      //   }
      // });
      
      const createApiCollection =  await strapi.entityService.create("api::api-collection.api-collection", {
        data: {
          api_collection_name: api_collection.api_collection_name,
          description: api_collection.api_collection_description,
          short_description: api_collection.api_collection_short_description,
          api_category_id: apiCategory.id
        }
      });

      const createObject = await strapi.entityService.create("api::api-coll-obj.api-coll-obj", {
        data: {
          object: object.object_json,
          api_collection: createApiCollection.id
        }
      });

      for(const attribute of object_attributes) {
        if(!attribute.child_attributes) {
          const createObjectAttribute = await strapi.entityService.create("api::api-coll-obj-attr.api-coll-obj-attr", {
            data: {
              attr_name: attribute.attribute_name,
              attr_type: attribute.attribute_type,
              attr_description: attribute.attribute_description,
              object_id: createObject.id
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
              child_attr_ids: childAttributesIds
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
            api_collection_id: createApiCollection.id
          }
        });
        const api_request_codes = api.api_request_codes;
        for(const api_request_code of api_request_codes) {
          const createApiRequestCode = await strapi.entityService.create("api::api-req-code-lang.api-req-code-lang", {
            data: {
              lang_name: api_request_code.language_name,
              api_req_code: api_request_code.api_request_code,
              api_id: createApi.id
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
                api_id: createApi.id
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
                child_attr_ids: findChildAttributes
              }
            });
          }
        }
      }
      ctx.send({message: "" + createApiCollection.id})
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  publishApiCollection: async (ctx) => {
    try {
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
      let {apiCollectionId} = ctx.request.body;
      apiCollectionId = parseInt(apiCollectionId);
      const maxDepth = 4; 
      const childAttr = "child_attr_ids"
      const childAttrfields = ["attr_name", "attr_type", "attr_description"];
      const childParam = "child_attr_ids";
      const childParamFields = ["attr_name", "attr_type", "attr_description"];
      
      ctx.request.query = {
        filters: {
          api_collections: {
            id: {
              $eq: apiCollectionId
            }
          },
        },
        fields: ["category_name"],
        populate: {
          api_collections: {
            filters: {
              id: {
                $eq: apiCollectionId
              }
            },
            fields: ["api_collection_name", "description", "short_description"],
            populate: {
              object_id: {
                fields: ["object"],
                populate: {
                  attr_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    populate: generatePopulate(maxDepth, childAttr, childAttrfields),
                  },
                },
              },
              api_ids: {
                fields: ["api_name", "api_description", "api_return", "api_method", "api_endpoint", "api_response_json"],
                populate: {
                  api_req_code_ids: {
                    fields: ["lang_name", "api_req_code"],
                  },
                  api_param_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
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
      if(result.length === 0) {
        ctx.send({message: "Api Collection Already Created"})
      }
      
      result.forEach(async (apiCategory) => {
        removeEmptyChildArrays(apiCategory)
        apiCategory.api_collections.forEach(async (apiCollection) => {
          const publishApiCollection = await strapi.entityService.update("api::api-collection.api-collection", apiCollection.id, {
            data: {
              publishedAt: Date.now(),
            }
          });
          const publishObject = await strapi.entityService.update("api::api-coll-obj.api-coll-obj", apiCollection.object_id.id, {
            data: {
              publishedAt: Date.now(),
            }
          });
          apiCollection.object_id.attr_ids.forEach(async (attribute) => {
            const publishObjectAttribute = await strapi.entityService.update("api::api-coll-obj-attr.api-coll-obj-attr", attribute.id, {
              data: {
                publishedAt: Date.now(),
              }
            });
            publishChildAttribute(attribute);
          })
          apiCollection.api_ids.forEach(async (api) => {
            const publishApi = await strapi.entityService.update("api::api.api", api.id, {
              data: {
                publishedAt: Date.now(),
              }
            })
            api.api_req_code_ids.forEach(async (apiReqCode) => {
              const publishApiReqCode = await strapi.entityService.update("api::api-req-code-lang.api-req-code-lang", apiReqCode.id, {
                data: {
                  publishedAt: Date.now(),
                }
              });
            })
            api.api_param_ids.forEach(async (apiParam) => {
              const publishApiParam = await strapi.entityService.update("api::api-param.api-param", apiParam.id, {
                data: {
                  publishedAt: Date.now(),
                }
              });
              deleteChildAttribute(apiParam);
            })
          })
        })
      });
      ctx.send({message: "Api Collection Documentation Created"})
  } catch (error) {
    await errorHandler(ctx, error);
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

function generatePopulateForDraft(depth, foreignKey, fields) {
  if (depth <= 0) {
    return {};
  }

  const populateObject = {};
  populateObject[foreignKey] = {
    fields,
    populate: {
      enum_ids: {
        fields: ["enum_name", "enum_description"]
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
        attr_description: attribute_description
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
    if(!(await checkChildAttributes(ctx, fileContentAttribute, schema.getSchemaObjectAttribute()))) {
      return;
    }

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
              return;
            }
          }
        }
      }
    }

    //check key of api_parameters
    for(const api of fileContentApi) {
      const fileContentParameter = api["api_parameters"];
      if(!(await checkChildAttributes(ctx, fileContentParameter, schema.getSchemaApiParameter()))) {
        return;
      }
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
        return false;
      }
      if(attribute.child_attributes) {
        await checkChildAttributes(ctx, attribute.child_attributes, schema)
      }
    }
    return true;
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
      }
    });
    childAttributesId = [];
  })
  findChildAttributes(attribute.child_attributes, childAttributesId);
  return;
}

async function deleteChildAttribute(attribute) {
  while(attribute.child_attr_ids) {
    attribute.forEach(async (attribute) => {
      const deleteObjectAttribute = await strapi.entityService.delete("api::api-coll-obj-attr.api-coll-obj-attr", attribute.id);
      deleteChildAttribute(attribute);
    })
  }
}

async function publishChildAttribute(attribute) {
  while(attribute.child_attr_ids) {
    attribute.forEach(async (attribute) => {
      const publishObjectAttribute = await strapi.entityService.update("api::api-coll-obj-attr.api-coll-obj-attr", attribute.id, {
        data: {
          publishedAt: Date.now(),
        }
      });
      publishChildAttribute(attribute);
    })
  }
}


//for old delete api collection
// const findOneResult = await strapi.entityService.findOne("api::api-collection.api-collection", collectionID,{
//   fields: ['api_collection_name'],
//   populate: {
//     access_controls: {
//       fields: ["status"],
//       filters: {
//         status: {
//           $eq: "Approved",
//         }
//       },
//       populate: {
//         vendor_id: {
//           fields: ["username"]
//         }
//       }
//     },
//   }
// });
// for(let i = 0; i < findOneResult.access_controls.length; i++){
//   let usernames = [];
//   findOneResult.access_controls.forEach(access_control => {
//     usernames.push(access_control.vendor_id.username);
//   })
//   const errorMessage = `Vendor ${usernames.join(', ')} have access to Api Collection ${findOneResult.api_collection_name}`;
//   console.log(errorMessage)
//   return ctx.send({message: errorMessage})
// }
// const deleteEntry = await strapi.entityService.delete("api::api-collection.api-collection", collectionID)
// ctx.send({message: `Api Collection ${findOneResult.api_collection_name} is deleted`});