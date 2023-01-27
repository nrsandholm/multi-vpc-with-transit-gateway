import { Stack, StackProps } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import path = require('path');
import { FargateUdpService } from './fargate-udp-service';

export interface AppStackProps extends StackProps {
  vpcA: Vpc,
  vpcB: Vpc,
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const { vpcA, vpcB } = props;

    const asset = new DockerImageAsset(this, 'ContainerImage', {
      directory: path.join('../app/'),
    });

    const serviceA = new FargateUdpService(this, 'A', {
      vpc: vpcA
    });

    const serviceB = new FargateUdpService(this, 'B', {
      vpc: vpcB
    });

    serviceA.addContainer({
      asset: asset,
      targetHost: serviceB.loadBalancer,
      targetPort: serviceB.udpServerPort,
      initDelay: 5000,
      responseDelay: 6000,
    });

    serviceB.addContainer({
      asset: asset,
      targetHost: serviceA.loadBalancer,
      targetPort: serviceA.udpServerPort,
      initDelay: 15000,
      responseDelay: 3000,
    });
  }   
}
