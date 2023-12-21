module.exports = {
    getSchemaApiCategory: () => {
        // const schema = ["category_name", "api_collection"]
        const schema = 
        {
            category_name: "string",
            api_collection: "object"
        }
        return schema;
    },

    getSchemaApiCollection: () => {
        // const schema = ["api_collection", "api_collection_description", "api_collection_short_description", "object"]
        const schema = 
        {
            api_collection_name: "string",
            api_collection_description: "string",
            api_collection_short_description: "string",
            object: "object",
            apis: "object"
        }
        return schema;
    },

    getSchemaObject: () => {
        const schema = 
        {
            object_json: "string",
            attributes: "object"
        }
        return schema;
    },

    getSchemaObjectAttribute: () => {
        const schema = 
        {
            attribute_name: "string",
            attribute_type: "string",
            attribute_description: "string"
        }

        return schema;
    },

    getSchemaApi: () => {
        const schema = 
        {
            api_name: "string",
            api_description: "string",
            api_return: "string",
            api_method: "string",
            api_endpoint: "string",
            api_response_json: "string",
            api_request_codes: "object",
            api_parameters: "object"
        }

        return schema;
    },

    getSchemaApiRequestCode: () => {
        const schema = 
        {
            language_name: "string",
            api_request_code: "string"
        }

        return schema;
    },

    getSchemaApiParameter: () => {
        const schema = 
        {
            attribute_name: "string",
            attribute_type: "string",
            attribute_description: "string"
        }

        return schema;
    },

    getLanguageType: () => {
        const language = ["java", "php", "javascript", "go", "http", "python", "ruby"];
        return language;
    }

}