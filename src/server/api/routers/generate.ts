import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

import { Configuration, OpenAIApi } from "openai";
import { env } from "~/env.mjs";
import { b64Image } from "~/data/b54image";

const configuration = new Configuration({
  apiKey: env.DALLE_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function generateIcon(prompt: string): Promise<string | undefined>{
  if(env.MOCK_DALLE === "true"){
    return b64Image;
  } else {
    const response = await openai.createImage({
      prompt,
      n: 1,
      size: "512x512",
      response_format: 'b64_json'
    });
    return response.data.data[0]?.b64_json;
  }
}

export const generateRouter = createTRPCRouter({
  generateIcon: protectedProcedure.input(
    z.object({
        prompt: z.string(),
    })
  ).mutation(async ({ctx, input}) =>{
    const {count} = await ctx.prisma.user.updateMany({
      where: {
        id: ctx.session.user.id,
        credits: {
          gte: 1
        },
      },
      data: {
        credits: {
          decrement: 1,
        }
      }
    });
    if(count <= 0){
      throw new TRPCError({code: "BAD_REQUEST", message: "You do not have enough credits"})
    }
  
    const base64EncodedImage = await generateIcon(input.prompt);

    // const icon = await ctx.prisma.icon.create({
    //   data: {
    //     prompt: input.prompt,
    //     userId: ctx.session.user.id,
    //   }
    // })

    //TODO: save images to the s3 bucket
    //npm install -save aws-sdk
    //const s3 = new AWS.S3({ credentials: {accessKeyId:, secretAccessKey: ,}, region: "us-east-1")
    // await s3.putObject({
    //   Bucket: 'icon-generator-course',
    //   Body: Buffer.from(base64EncodedImage!, "base64"),
    //   key: icon.id
    //   ContentEncoding: "base64",
    //   ContentType: "image/png"
    // })
    // .Promise();
    return {
        imageUrl: base64EncodedImage,
    }
  }),
});
