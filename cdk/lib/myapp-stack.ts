import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import * as path from 'path';

export class MyAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new lambda.Function(this, 'LambdaHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../', 'lambda')),
      handler: 'src/handler.handler',
    });
    const api = new apiGateway.RestApi(this, 'Api');
    const apiIntegration = new apiGateway.LambdaIntegration(handler, {
      requestTemplates: { 'application/json': JSON.stringify({ statusCode: 200 }) },
    });
    api.root.addMethod('GET', apiIntegration);
  }
}
