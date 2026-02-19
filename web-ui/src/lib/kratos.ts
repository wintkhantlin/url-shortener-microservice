import { Configuration, FrontendApi } from "@ory/client"

const authUrl = import.meta.env.APP_AUTH_URL;
if (!authUrl) {
    throw new Error("APP_AUTH_URL is not defined");
}

export const kratos = new FrontendApi(
    new Configuration({
        basePath: authUrl,
        baseOptions: {
            withCredentials: true
        }
    })
)
