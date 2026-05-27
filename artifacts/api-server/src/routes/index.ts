import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import servicesRouter from "./services.js";
import numbersRouter from "./numbers.js";
import balanceRouter from "./balance.js";
import developerRouter from "./developer.js";
import adminRouter from "./admin.js";
import contactRouter from "./contact.js";
import paxityRouter from "./paxity.js";
import omnipayRouter from "./omnipay.js";
import sendavapayRouter from "./sendavapay.js";
import ashtechpayRouter from "./ashtechpay.js";
import operatorRoutesRouter from "./operator-routes.js";
import discountsRouter from "./discounts.js";
import telegramRouter from "./telegram.js";
import affiliateRouter from "./affiliate.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(servicesRouter);
router.use(numbersRouter);
router.use(balanceRouter);
router.use(developerRouter);
router.use(adminRouter);
router.use(contactRouter);
router.use(paxityRouter);
router.use(omnipayRouter);
router.use(sendavapayRouter);
router.use(ashtechpayRouter);
router.use(operatorRoutesRouter);
router.use(discountsRouter);
router.use(telegramRouter);
router.use(affiliateRouter);

export default router;
