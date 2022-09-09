# Self-Attentive Sequential Recommendation

> Accepted by ICDM'18，Wang-Cheng KangJulian McAuley|[原tensorflow实现](https://github.com/kang205/SASRec)|[pytorch实现](https://github.com/pmixer/SASRec.pytorch)

## Abstract

一般而言，基于MC的方法在模型简约性至关重要的极稀疏数据集上表现最好，而RNN在模型复杂度较高的密集数据集上表现得更好。我们工作的目标是通过提出一个基于自我注意的顺序模型(SASRec)来平衡这两个目标，该模型允许我们捕获长期语义(如RNN)，但使用注意机制，基于相对较少的动作(如MC)进行预测。在每一个时间步，SASRec都会从用户的行为历史中找出哪些项目是“相关的”，并用它们来判断下一个项目。

## METHODOLOGY

![image-20220406190702139](_images/SASRec/image-20220406190702139.png)

![image-20220406191744488](_images/SASRec/image-20220406191744488.png)

### A. Embedding Layer

序列表示为s=(s1,s2,s3,...,sn),M<sub>Si</sub>为Si的项目嵌入，P<sub>i</sub>为可学习的位置嵌入。P，M∈R<sup>n×d</sup>

![MommyTalk1649243374864](_images/SASRec/MommyTalk1649243374864.svg)

### B. Self-Attention Block

- Self-Attention layer

  由于序列的性质，在预测(t+1)时，模型应该只考虑前t个项目。因此，我们修改了注意力，禁止Q<sub>i</sub>和K<sub>j</sub>(j>i)之间的所有联系。
  
  ![MommyTalk1649243445388](_images/SASRec/MommyTalk1649243445388.svg)
  
- Point-Wise Feed-Forward Network
  
  虽然自我注意能够通过自适应权重聚合所有先前项目的嵌入，但最终它仍然是一个线性模型。为了使模型具有非线性，并考虑不同潜在维度之间的相互作用，我们对所有的S<sub>i</sub>都采用了一个逐点的两层前馈网络(共享参数):
  
  ![MommyTalk1649243483389](_images/SASRec/MommyTalk1649243483389.svg)

### C. Stacking Self-Attention Blocks

通过堆叠Self-Attention Block来学习更复杂的项目转换：

![MommyTalk1649243539216](_images/SASRec/MommyTalk1649243539216.svg)

随着网络的深入，几个问题变得更加严重：1)模型容量的增加导致过拟合；2)训练过程变得不稳定(由于梯度消失等)；3)参数越多的模型需要更多的训练时间。对自注意力层和前馈网络层使用层归一化和残差连接：（其中g(X)表示自注意力层或前馈网络层）

![MommyTalk1649243567251](_images/SASRec/MommyTalk1649243567251.svg)

### D. Prediction Layer

![MommyTalk1649243599917](_images/SASRec/MommyTalk1649243599917.svg)

- **Shared Item Embedding:**

  ![MommyTalk1649243626971](_images/SASRec/MommyTalk1649243626971.svg)

  使用同类项嵌入的潜在问题是它们的内积不能表示非对称项转移(例如，项i经常在j之后被购买，反之亦然)，因此现有的方法，如FPMC，倾向于使用异质项嵌入。然而，我们的模型没有这个问题，因为它学习了一个非线性变换。例如，前馈网络可以很容易地实现相同项嵌入的非对称性：$\operatorname{FFN}\left(\mathbf{M}_{i}\right) \mathbf{M}_{j}^{T} \neq \operatorname{FFN}\left(\mathbf{M}_{j}\right) \mathbf{M}_{i}^{T}$。经验表明，使用共享项嵌入显著提高了模型的性能。

- **Explicit User Modeling:**

  ![MommyTalk1649243667346](_images/SASRec/MommyTalk1649243667346.svg)

  我们也可以在最后一层插入一个显式的用户嵌入,然而，我们根据实验发现，添加显式用户嵌入并不会提高性能(大概是因为该模型已经考虑了用户的所有行为)。

### E. Network Training

![MommyTalk1649243706145](_images/SASRec/MommyTalk1649243706145.svg)

![MommyTalk1649243730867](_images/SASRec/MommyTalk1649243730867.svg)

## EXPERIMENTS

### Datasets

对于默认版本的SASRec中的体系结构，我们使用了两个自我注意块(b=2)，并使用了学习位置嵌入。嵌入层和预测层中的项嵌入是共享的。优化器是ADAM优化器，学习率设置为0.001，批次大小为128.

![image-20220406191825791](_images/SASRec/image-20220406191825791.png)

### Recommendation Performance

RQ1.SASRec是否优于最先进的模型，包括基于CNN/RNN的方法？

![image-20220406191856013](_images/SASRec/image-20220406191856013.png)

![image-20220406192048351](_images/SASRec/image-20220406192048351.png)

### Ablation Study

RQ2.SASRec架构中的各种组件有何影响？

![image-20220406192117157](_images/SASRec/image-20220406192117157.png)

### Training Efficiency & Scalability

RQ3.SASRec的训练效率和可扩展性是什么？

![image-20220406192220078](_images/SASRec/image-20220406192220078.png)

![image-20220406192255225](_images/SASRec/image-20220406192255225.png)

在计算效率上SASRec有明显的提高，而且对于较长的序列的处理时间也不慢。我们的模型可以很容易地扩展到多达几百个动作的用户序列，这适用于典型的评论和购买数据集。

### Visualizing Attention Weights

RQ4.注意权重能够学习与位置或物品属性相关的有意义的模式吗？

![image-20220406192638920](_images/SASRec/image-20220406192638920.png)

- a,b比较：这是使我们的模型能够自适应地处理稀疏和密集数据集的关键因素，而现有的方法往往集中在光谱的一端。
- b,c比较：这一比较显示了使用位置嵌入(PE)的效果。没有它们，注意力权重基本上均匀地分布在以前的项目上，而默认模型(C)更敏感，因为它倾向于关注最近的项目。
- 比较c,d:由于我们的模型是分层次的，所以关注度在不同的块有所不同。显然，高层的注意力往往集中在最近的位置上。这可能是因为第一个自我注意块已经考虑了之前所有的项目，而第二个自我注意障碍不需要考虑远处的位置。

为了进行更广泛的比较，使用MovieLens-1M，其中每部电影有几个类别，我们随机选择两个不相交的集合，每个集合包含来自4个类别的200部电影：科幻(科幻)、浪漫、动画和恐怖。第一个集合用于查询，第二个集合用作关键字。图5显示了两组人的平均注意力权重的热图。我们可以看到热图大约是一个块对角线矩阵，这意味着注意机制可以识别相似的项目(例如，共享共同类别的项目)，并倾向于在它们之间分配更大的权重(而不事先知道类别)

![image-20220406192702255](_images/SASRec/image-20220406192702255.png)

## CONCLUSION

我们提出了一种新颖的基于自我注意的顺序模型 SASRec，用于下一个项目推荐。  SASRec 对整个用户序列进行建模（没有任何循环或卷积操作），并自适应地考虑消费项目进行预测。 未来，我们计划通过结合丰富的上下文信息（例如停留时间、动作类型、位置、设备等）来扩展模型，并研究处理超长序列（例如点击）的方法。
