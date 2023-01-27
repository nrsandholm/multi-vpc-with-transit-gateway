import { Stack, StackProps } from 'aws-cdk-lib';
import { Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { AwsLogDriver, Cluster, ContainerImage, FargateService, FargateTaskDefinition, Protocol as EcsProtocol } from 'aws-cdk-lib/aws-ecs';
import { NetworkLoadBalancer, Protocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import path = require('path');

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

    // Clusters
    const clusterA = new Cluster(this, 'ClusterA', {
      vpc: vpcA,
    });

    const clusterB = new Cluster(this, 'ClusterB', {
      vpc: vpcB,
    });

    // Load balancers
    const loadBalancerA = new NetworkLoadBalancer(this, 'LoadBalancerA', {
      vpc: vpcA,
    });

    const loadBalancerB = new NetworkLoadBalancer(this, 'LoadBalancerB', {
      vpc: vpcB,
    });

    // Task definitions
    const taskDefinitionA = new FargateTaskDefinition(this, 'TaskDefinitionA', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    taskDefinitionA.addContainer('Container', {
      containerName: 'app',
      image: ContainerImage.fromDockerImageAsset(asset),
      logging: new AwsLogDriver({ streamPrefix: 'app-a' }),
      readonlyRootFilesystem: true,
      environment: {
        'SERVER_PORT': '3001',
        'HTTP_SERVER_PORT': '3000',
        'TARGET_HOST': `${loadBalancerB.loadBalancerDnsName}`,
        'TARGET_PORT': '3001',
        'INIT_DELAY': '5000',
        'RESPONSE_DELAY': '6000',
      },
      portMappings: [{
        containerPort: 3000,
        protocol: EcsProtocol.TCP,
      }, {
        containerPort: 3001,
        protocol: EcsProtocol.UDP,
      }],
    });

    const taskDefinitionB = new FargateTaskDefinition(this, 'TaskDefinitionB', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    taskDefinitionB.addContainer('Container', {
      containerName: 'app',
      image: ContainerImage.fromDockerImageAsset(asset),
      logging: new AwsLogDriver({ streamPrefix: 'app-b' }),
      readonlyRootFilesystem: true,
      environment: {
        'SERVER_PORT': '3001',
        'HTTP_SERVER_PORT': '3000',
        'TARGET_HOST': `${loadBalancerA.loadBalancerDnsName}`,
        'TARGET_PORT': '3001',
        'INIT_DELAY': '15000',
        'RESPONSE_DELAY': '3000',
      },
      portMappings: [{
        containerPort: 3000,
        protocol: EcsProtocol.TCP,
      }, {
        containerPort: 3001,
        protocol: EcsProtocol.UDP,
      }],
    });

    // Services
    const serviceA = new FargateService(this, 'ServiceA', {
      taskDefinition: taskDefinitionA,
      cluster: clusterA,
    });
    // Allow health checks
    serviceA.connections.allowFromAnyIpv4(Port.tcp(3000));
    // Allow socket
    serviceA.connections.allowFromAnyIpv4(Port.udp(3001));

    const serviceB = new FargateService(this, 'ServiceB', {
      taskDefinition: taskDefinitionB,
      cluster: clusterB,
    });
    // Allow health checks
    serviceB.connections.allowFromAnyIpv4(Port.tcp(3000));
    // Allow socket
    serviceB.connections.allowFromAnyIpv4(Port.udp(3001));

    // Listeners
    const listenerA = loadBalancerA.addListener('ListenerA', {
      port: 3001,
      protocol: Protocol.UDP,
    });

    const listenerB = loadBalancerB.addListener('ListenerB', {
      port: 3001,
      protocol: Protocol.UDP,
    });

    // Targets
    listenerA.addTargets('TargetA', {
      port: 3001,
      protocol: Protocol.UDP,
      targets: [serviceA],
      healthCheck: {
        port: '3000',
        protocol: Protocol.HTTP,
      },
    });

    listenerB.addTargets('TargetB', {
      port: 3001,
      protocol: Protocol.UDP,
      targets: [serviceB],
      healthCheck: {
        port: '3000',
        protocol: Protocol.HTTP,
      },
    });
  }
}
