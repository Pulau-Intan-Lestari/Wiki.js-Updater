import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import http from 'http';
dotenv.config();
import bodyParser from 'body-parser';
import cors from 'cors'
import * as path from 'path';
import MyAppoloClient from './AppoloClient'
import { CreatePage } from './Controller/PageWiki';
import { PrismaClient as PCPIL } from "../dist/prismapil";
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma_pil = new PCPIL();
const prisma = new PrismaClient();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: "*",
  optionsSuccessStatus: 200
}))
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'html'));
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.apolloClient = MyAppoloClient
  req.prisma = prisma;
  req.prismapil = prisma_pil;
  next();
});

// Routes for Experimenting stuff
app.get('/', async (req: Request, res) => {
  try {
    return res.status(200).json({ info: "it works" });
  } catch (error) {
    console.log(error)
    res.status(400).json({
      code: "1",
      error
    })
  }
});

app.get("/create-page", CreatePage);

// Create an HTTP server and WebSocket server
const server = http.createServer(app);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Graphql Client ${process.env.GRAPH_QL_ENDPOINT} Connected`)
  const tes: { status_con: number }[] = await prisma.$queryRaw`Select 1 as status_con`
  const tes2: { status_con: number }[] = await prisma_pil.$queryRaw`Select 1 as status_con`
  console.log(`DB 1 ${tes?.[0]?.status_con ? 'Connected' : 'Disconnected'}`)
  console.log(`DB 2 ${tes2?.[0]?.status_con ? 'Connected' : 'Disconnected'}`)
  console.log(`Server listening on port ${PORT}`);
});
