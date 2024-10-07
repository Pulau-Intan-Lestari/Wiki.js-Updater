import { gql } from "@apollo/client/core";
import { Request, Response } from "express";

export const CreatePage = async (req: Request, res: Response) => {
    try {
        const response = await CreateSinglePage(req, {
            content: "tes lagi",
            description: "from node js to wiki",
            editor: "ckeditor",
            isPrivate: false,
            isPublished: true,
            locale: 'en',
            path: "home/tes2",
            tags: [],
            title: "tesss lagiii"
        });

        return res.status(200).json({ data: response.data });
    } catch (error) {
        return res.status(400).json(error)
    }
}

export const CreateSinglePage = async (req: Request, variables: {
    content: string,
    description: string,
    editor: "ckeditor" | "markdown",
    isPublished: boolean,
    isPrivate: boolean,
    locale: "en",
    path: string,
    tags: string[],
    title: string
}) => {
    const CREATE_PAGE = gql`
        mutation CreatePage(
            $content: String!,
            $description: String!,
            $editor: String!,
            $isPublished: Boolean!,
            $isPrivate: Boolean!,
            $locale: String!,
            $path: String!,
            $tags: [String!]!,
            $title: String!
        ) {
            pages {
                create(
                    content: $content,
                    description: $description,
                    editor: $editor,
                    isPublished: $isPublished,
                    isPrivate: $isPrivate,
                    locale: $locale,
                    path: $path,
                    tags: $tags,
                    title: $title
                ) {
                    page {
                        id
                    }
                }
            }
        }
    `;

    const response = await req.apolloClient.mutate({
        mutation: CREATE_PAGE,
        variables,
    });
    return response
}