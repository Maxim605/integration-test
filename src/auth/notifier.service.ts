import { Injectable } from "@nestjs/common";

@Injectable()
export class NotifierService {
  async sendNotification(data: { message: string }) {
    console.log("sendNotification", data.message);
    return { delivered: true };
  }
}
