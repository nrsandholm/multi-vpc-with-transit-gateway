import { Resource, ResourceProps } from 'aws-cdk-lib';
import { Port, Vpc } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { AwsLogDriver, Cluster, ContainerImage, FargateService, FargateTaskDefinition, Protocol as EcsProtocol, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { NetworkListener, NetworkLoadBalancer, Protocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export interface FargateUdpServiceProps extends ResourceProps {
  vpc: Vpc
}
  
export interface ContainerDefinitionOptions {
  asset: DockerImageAsset,
  targetHost: NetworkLoadBalancer,
  targetPort: number,
  initDelay: number,
  responseDelay: number,
}
  
export class FargateUdpService extends Resource {
  private readonly cluster: Cluster;
  private readonly taskDefinition: TaskDefinition;
  private readonly service: FargateService;
  private readonly healthCheckServerPort: number = 3000;
  private readonly listener: NetworkListener;
  private readonly id: string;

  readonly loadBalancer: NetworkLoadBalancer;
  readonly udpServerPort: number = 3001;

  constructor(scope: Construct, id: string, props: FargateUdpServiceProps) {
    super(scope, id, props);

    const { vpc } = props;

    this.id = id;

    this.cluster = new Cluster(scope, `Cluster${id}`, {
      vpc: vpc,
    });

    this.taskDefinition = new FargateTaskDefinition(scope, `TaskDefinition${id}`, {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    this.service = new FargateService(scope, `Service${id}`, {
      taskDefinition: this.taskDefinition,
      cluster: this.cluster,
    });
    // Allow health checks
    this.service.connections.allowFromAnyIpv4(Port.tcp(this.healthCheckServerPort));
    // Allow socket
    this.service.connections.allowFromAnyIpv4(Port.udp(this.udpServerPort));

    this.loadBalancer = new NetworkLoadBalancer(scope, `LoadBalancer${id}`, {
      vpc: vpc,
    });

    this.listener = this.loadBalancer.addListener(`Listener${id}`, {
      port: this.udpServerPort,
      protocol: Protocol.UDP,
    });
  }

  addContainer(options: ContainerDefinitionOptions) {
    if (this.taskDefinition.findContainer('app')) {
      throw new Error('Only one container can be added');
    }
    this.taskDefinition.addContainer('Container', {
      containerName: 'app',
      image: ContainerImage.fromDockerImageAsset(options.asset),
      logging: new AwsLogDriver({ streamPrefix: `app-${this.id.toLocaleLowerCase()}` }),
      readonlyRootFilesystem: true,
      environment: {
        'SERVER_PORT': this.udpServerPort.toString(),
        'HTTP_SERVER_PORT': this.healthCheckServerPort.toString(),
        'TARGET_HOST': options.targetHost.loadBalancerDnsName,
        'TARGET_PORT': options.targetPort.toString(),
        'INIT_DELAY': options.initDelay.toString(),
        'RESPONSE_DELAY': options.responseDelay.toString(),
      },
      portMappings: [{
        containerPort: this.healthCheckServerPort,
        protocol: EcsProtocol.TCP,
      }, {
        containerPort: this.udpServerPort,
        protocol: EcsProtocol.UDP,
      }],
    });

    this.listener.addTargets(`Target${this.id}`, {
      port: this.udpServerPort,
      protocol: Protocol.UDP,
      targets: [this.service],
      healthCheck: {
        port: this.healthCheckServerPort.toString(),
        protocol: Protocol.HTTP,
      },
    });
  }
}