import { Stack, StackProps } from 'aws-cdk-lib';
import { ResourceType } from 'aws-cdk-lib/aws-config';
import { AllocateCidrRequest, CfnTransitGateway, CfnTransitGatewayAttachment, FlowLog, FlowLogDestination, FlowLogResourceType, IpAddresses, ISubnet, Subnet, SubnetIpamOptions, SubnetType, Vpc, VpcIpamOptions } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpcA = new Vpc(this, 'VpcA', {
      maxAzs: 1,
      vpcName: 'VpcA',
      ipAddresses: {
        allocateSubnetsCidr: (input: AllocateCidrRequest): SubnetIpamOptions => {
          return {
            allocatedSubnets: [{
              cidr: '10.0.0.0/25',
            }, {
              cidr: '10.0.0.128/25',
            }]
          }
        },
        allocateVpcCidr: (): VpcIpamOptions => {
          return {
            cidrBlock: '10.0.0.0/24',
          }
        },
      },
      subnetConfiguration: [{
        name: 'PrivateSubnetA',
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }, {
        name: 'PublicSubnetA',
        subnetType: SubnetType.PUBLIC,
      }]
    });

    const vpcB = new Vpc(this, 'VpcB', {
      maxAzs: 1,
      vpcName: 'VpcB',
      ipAddresses: {
        allocateSubnetsCidr: (input: AllocateCidrRequest): SubnetIpamOptions => {
          return {
            allocatedSubnets: [{
              cidr: '10.0.1.0/25',
            }, {
              cidr: '10.0.1.128/25',
            }]
          }
        },
        allocateVpcCidr: (): VpcIpamOptions => {
          return {
            cidrBlock: '10.0.1.0/24',
          }
        },
      },
      subnetConfiguration: [{
        name: 'PrivateSubnetB',
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }, {
        name: 'PublicSubnetB',
        subnetType: SubnetType.PUBLIC,
      }]
    });

    const transitGateway = new CfnTransitGateway(this, 'TransitGateway', {
      transitGatewayCidrBlocks: [
        vpcA.vpcCidrBlock,
        vpcB.vpcCidrBlock,
      ],
    });

    new CfnTransitGatewayAttachment(this, 'TransitGatewayAttachmentVpcA', {
      vpcId: vpcA.vpcId,
      subnetIds: vpcA.publicSubnets.map((subnet: ISubnet) => subnet.subnetId),
      transitGatewayId: transitGateway.attrId,
    });

    new CfnTransitGatewayAttachment(this, 'TransitGatewayAttachmentVpcB', {
      vpcId: vpcB.vpcId,
      subnetIds: vpcB.publicSubnets.map((subnet: ISubnet) => subnet.subnetId),
      transitGatewayId: transitGateway.attrId,
    });

    new FlowLog(this, 'TransitGatewayFlowLog', {
      resourceType: FlowLogResourceType.fromNetworkInterfaceId(transitGateway.attrId),
      destination: FlowLogDestination.toCloudWatchLogs()
    });
  }
}
