import * as cdk from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as pipelines from '@aws-cdk/pipelines';
import { MyAppStack } from './myapp-stack';

class MyAppStackStage extends cdk.Stage {
    urlOutput: cdk.CfnOutput;

    constructor(scope: cdk.Construct, id: string, options?: cdk.StackProps) {
        super(scope, id, options);

        const service = new MyAppStack(this, 'MyAppService', {
            tags: {
                Application: 'MyAppService',
                Environment: id
            }
        });
        this.urlOutput = service.urlOutput;
    }
}

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, options?: cdk.StackProps) {
        super(scope, id, options);

        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const sourceAction = new codepipelineActions.GitHubSourceAction({
            actionName: 'GitHub',
            output: sourceArtifact,
            oauthToken: cdk.SecretValue.secretsManager('github-token'),
            owner: 'petrabarus',
            repo: 'cdk-pipeline-demo-2',
            branch: 'main',
        });
        
        const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            subdirectory: 'cdk',
            buildCommand: 'npm run build && npm run test',
        });

        const pipeline = new pipelines.CdkPipeline(this, 'Pipeline', {
            cloudAssemblyArtifact,
            sourceAction,
            synthAction,
        });

        //PRE-PROD
        const preProdApp = new MyAppStackStage(this, 'PreProd');
        const preProdStage = pipeline.addApplicationStage(preProdApp);
        
        //Integration test
        const serviceUrl = pipeline.stackOutput(preProdApp.urlOutput);
        const integrationAction = new pipelines.ShellScriptAction({
            actionName: 'IntegrationTest',
            runOrder: preProdStage.nextSequentialRunOrder(),
            additionalArtifacts: [
                sourceArtifact
            ],
            commands: [
                'cd lambda',
                'npm install',
                'npm run build',
                'npm run integration_test',
            ],
            useOutputs: {
                SERVICE_URL: serviceUrl,
            }
        });
        preProdStage.addActions(integrationAction);
        
        //PROD
        const prodApp = new MyAppStackStage(this, 'Prod');
        const prodStage = pipeline.addApplicationStage(prodApp);
    }
}
